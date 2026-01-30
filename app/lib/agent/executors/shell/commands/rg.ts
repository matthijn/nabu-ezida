import { grep } from "./grep"
import type { Files } from "../types"

export const rg = {
  ...grep,
  description: "Alias for grep",
  usage: grep.usage.replace("grep", "rg"),
  createHandler: (files: Files) => {
    const grepHandler = grep.createHandler(files)
    return (args: string[], stdin: string) => {
      const result = grepHandler(args, stdin)
      if (result.error) return result
      const hint = "\n(rg is alias for grep — prefer grep)"
      return { ...result, output: result.output + hint }
    }
  },
}
