import { z } from "zod"
import type { Handler, HandlerResult, Operation } from "../../types"
import { createShell, type Operation as ShellOperation } from "./shell"

export type ShellCommandOutput = {
  stdout: string
  stderr: string
  outcome: { type: "exit"; exit_code: number }
}

export const shellHandler: Handler<ShellCommandOutput[]> = async (files, args) => {
  const parsed = ShellArgs.safeParse(args)
  if (!parsed.success) return formatZodError(parsed.error)

  const { commands } = parsed.data
  const shell = createShell(files)
  const mutations: Operation[] = []

  const results: ShellCommandOutput[] = commands.map((cmd) => {
    const { output, operations, isError } = shell.exec(cmd)

    if (!isError) {
      mutations.push(...operations.map(toPatchOperation))
    }

    return {
      stdout: isError ? "" : output,
      stderr: isError ? output : "",
      outcome: { type: "exit" as const, exit_code: isError ? 1 : 0 },
    }
  })

  const hasError = results.some((r) => r.outcome.exit_code !== 0)

  return {
    status: hasError ? "partial" : "ok",
    output: results,
    mutations,
  }
}

const ShellArgs = z.object({
  commands: z.array(z.string()).min(1, "commands required - what shell commands to run?"),
})

const formatZodError = (error: z.ZodError): HandlerResult<ShellCommandOutput[]> => ({
  status: "error",
  output: error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
  mutations: [],
})

const formatCreateDiff = (path: string, content: string): string =>
  content === "" ? `*** Add File: ${path}` : `*** Add File: ${path}\n${content}`

const toPatchOperation = (op: ShellOperation): Operation => {
  switch (op.type) {
    case "create":
      return { type: "create_file", path: op.path, diff: formatCreateDiff(op.path, op.content) }
    case "delete":
      return { type: "delete_file", path: op.path }
    case "rename":
      return { type: "rename_file", path: op.path, newPath: op.newPath }
  }
}
