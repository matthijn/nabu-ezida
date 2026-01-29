import { z } from "zod"
import type { Handler, ToolResult } from "../../types"
import { getFiles } from "~/lib/files"
import { applyOperation, type Operation as PatchOperation } from "../patch"
import { createShell, type Files, type Operation as ShellOperation } from "./shell"

const ShellArgs = z.object({
  commands: z.array(z.string()).min(1, "commands required - what shell commands to run?"),
})

export type ShellCommandOutput = {
  stdout: string
  stderr: string
  outcome: { type: "exit"; exit_code: number }
}

const formatZodError = (error: z.ZodError): ToolResult<ShellCommandOutput[]> => ({
  status: "error",
  output: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
})

const filesToMap = (files: Record<string, { raw: string }>): Files =>
  new Map(Object.entries(files).map(([k, v]) => [k, v.raw]))

const formatCreateDiff = (path: string, content: string): string =>
  content === "" ? `*** Add File: ${path}` : `*** Add File: ${path}\n${content}`

const toPatchOperation = (op: ShellOperation): PatchOperation => {
  switch (op.type) {
    case "create":
      return { type: "create_file", path: op.path, diff: formatCreateDiff(op.path, op.content) }
    case "delete":
      return { type: "delete_file", path: op.path }
    case "rename":
      return { type: "rename_file", oldPath: op.oldPath, newPath: op.newPath }
  }
}

const applyOperations = (operations: ShellOperation[]): string[] => {
  const errors: string[] = []
  for (const op of operations) {
    const result = applyOperation(toPatchOperation(op))
    if (result.status === "error") {
      errors.push(result.output)
    }
  }
  return errors
}

export const shellTool: Handler<ShellCommandOutput[]> = async (_, args) => {
  const parsed = ShellArgs.safeParse(args)
  if (!parsed.success) return formatZodError(parsed.error)

  const { commands } = parsed.data
  const files = filesToMap(getFiles() as Record<string, { raw: string }>)
  const shell = createShell(files)

  const results: ShellCommandOutput[] = commands.map((cmd) => {
    const { output, operations } = shell.exec(cmd)
    const opErrors = applyOperations(operations)

    const isError = output.includes(": No such file") ||
                    output.startsWith("Unknown command:") ||
                    output.startsWith("Unsupported ") ||
                    opErrors.length > 0

    const fullOutput = opErrors.length > 0 ? [output, ...opErrors].filter(Boolean).join("\n") : output
    const stderr = isError ? fullOutput : ""

    return {
      stdout: isError ? "" : fullOutput,
      stderr,
      outcome: { type: "exit" as const, exit_code: stderr ? 1 : 0 },
    }
  })

  const hasError = results.some((r) => r.outcome.exit_code !== 0)
  return { status: hasError ? "partial" : "ok", output: results }
}
