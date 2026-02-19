import { z } from "zod"
import { getShellDocs } from "../shell/shell"

const ShellArgs = z.object({
  commands: z
    .array(z.string().describe("A shell command to execute"))
    .min(1)
    .describe("Shell commands to run sequentially. Each command runs in the virtual shell environment."),
})

export const runLocalShell = {
  name: "run_local_shell" as const,
  description: getShellDocs(),
  schema: ShellArgs,
}
