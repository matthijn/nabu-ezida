import type { Handler } from "../../types"
import { getFiles } from "~/lib/files"
import { createShell, type Files } from "./shell"

type ShellArgs = {
  commands: string[]
}

type ShellCommandOutput = {
  stdout: string
  stderr: string
  outcome: { type: "exit"; exit_code: number }
}

const filesToMap = (files: Record<string, { raw: string }>): Files =>
  new Map(Object.entries(files).map(([k, v]) => [k, v.raw]))

export const shellTool: Handler = async (_, args) => {
  const { commands } = args as ShellArgs

  if (!commands || !Array.isArray(commands)) {
    return [{ stdout: "", stderr: "commands array is required", outcome: { type: "exit", exit_code: 1 } }]
  }

  const files = filesToMap(getFiles() as Record<string, { raw: string }>)
  const shell = createShell(files)

  const results: ShellCommandOutput[] = commands.map((cmd) => {
    const output = shell.exec(cmd)
    const isError = output.includes(": No such file") ||
                    output.startsWith("Unknown command:") ||
                    output.startsWith("Unsupported ")
    const stderr = isError ? output : ""
    return {
      stdout: isError ? "" : output,
      stderr,
      outcome: { type: "exit" as const, exit_code: stderr ? 1 : 0 },
    }
  })

  return results
}
