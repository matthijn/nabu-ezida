import { z } from "zod"
import type { Handler } from "../../types"
import { getFiles, getFileRaw, updateFileRaw, deleteFile, renameFile } from "~/lib/files"
import { createShell, type Files, type Operation } from "./shell"

const ShellArgs = z.object({
  commands: z.array(z.string()).min(1, "commands required - what shell commands to run?"),
})

type ShellCommandOutput = {
  stdout: string
  stderr: string
  outcome: { type: "exit"; exit_code: number }
}

const formatError = (error: z.ZodError): ShellCommandOutput[] => [{
  stdout: "",
  stderr: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
  outcome: { type: "exit", exit_code: 1 },
}]

const filesToMap = (files: Record<string, { raw: string }>): Files =>
  new Map(Object.entries(files).map(([k, v]) => [k, v.raw]))

const applyOperation = (op: Operation): { ok: boolean; error?: string } => {
  switch (op.type) {
    case "create":
      if (getFileRaw(op.path)) return { ok: false, error: "already exists" }
      updateFileRaw(op.path, op.content)
      return { ok: true }
    case "delete":
      if (!getFileRaw(op.path)) return { ok: false, error: "No such file" }
      deleteFile(op.path)
      return { ok: true }
    case "rename":
      if (!getFileRaw(op.oldPath)) return { ok: false, error: "No such file" }
      if (getFileRaw(op.newPath)) return { ok: false, error: "already exists" }
      renameFile(op.oldPath, op.newPath)
      return { ok: true }
  }
}

const applyOperations = (operations: Operation[]): string[] => {
  const results: string[] = []
  for (const op of operations) {
    const result = applyOperation(op)
    if (!result.ok) {
      const path = op.type === "rename" ? op.oldPath : op.path
      results.push(`error: ${path}: ${result.error}`)
    }
  }
  return results
}

export const shellTool: Handler = async (_, args) => {
  const parsed = ShellArgs.safeParse(args)
  if (!parsed.success) return formatError(parsed.error)

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

  return results
}
