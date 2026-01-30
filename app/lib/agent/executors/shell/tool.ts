import { z } from "zod"
import type { Operation } from "../../types"
import { tool, registerTool, ok, partial } from "../tool"
import { createShell, getShellDocs, type Operation as ShellOperation } from "./shell"

export type ShellCommandOutput = {
  stdout: string
  stderr: string
  outcome: { type: "exit"; exit_code: number }
}

const ShellArgs = z.object({
  commands: z
    .array(z.string().describe("A shell command to execute"))
    .min(1)
    .describe("Shell commands to run sequentially. Each command runs in the virtual shell environment."),
})

export const runLocalShell = registerTool(
  tool({
    name: "run_local_shell",
    description: getShellDocs(),
    schema: ShellArgs,
    handler: async (files, { commands }) => {
      const shell = createShell(files)
      const mutations: Operation[] = []

      let hasRealError = false
      const results: ShellCommandOutput[] = commands.map((cmd) => {
        const { output, operations, isError, exitCode } = shell.exec(cmd)

        if (!isError) {
          mutations.push(...operations.map(toPatchOperation))
        } else {
          hasRealError = true
        }

        const exit_code = exitCode ?? (isError ? 1 : 0)
        return {
          stdout: isError ? "" : output,
          stderr: isError ? output : "",
          outcome: { type: "exit" as const, exit_code },
        }
      })

      const successCount = results.filter((r) => r.stderr === "").length
      const message = hasRealError
        ? `${successCount}/${results.length} commands succeeded. Don't retry if you have the information you need.`
        : "All commands completed successfully."

      return hasRealError ? partial(results, message, mutations) : ok(results, mutations)
    },
  })
)

export const shellHandler = runLocalShell.handle

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
