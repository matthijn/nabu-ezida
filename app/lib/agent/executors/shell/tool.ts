import { z } from "zod"
import { tool, registerTool, ok, partial } from "../tool"
import { createShell, getShellDocs } from "./shell"
import { initJq } from "./commands/jq"

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
      await initJq()
      const shell = createShell(files)

      let hasRealError = false
      const results: ShellCommandOutput[] = commands.map((cmd) => {
        const { output, isError, exitCode } = shell.exec(cmd)

        if (isError) hasRealError = true

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

      return hasRealError ? partial(results, message) : ok(results)
    },
  })
)

export const shellHandler = runLocalShell.handle
