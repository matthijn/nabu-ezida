import { tool, registerTool, ok, partial } from "../tool"
import { runLocalShell as def } from "./run-local-shell.def"
import { createShell } from "../shell/shell"
import { initJq } from "../shell/commands/jq"

export type ShellCommandOutput = {
  stdout: string
  stderr: string
  outcome: { type: "exit"; exit_code: number }
}

export const runLocalShell = registerTool(
  tool({
    ...def,
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
