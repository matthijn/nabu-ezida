import type { Files } from "../types"

export type Operation =
  | { type: "create"; path: string; content: string }
  | { type: "delete"; path: string }
  | { type: "rename"; oldPath: string; newPath: string }

export type Result = { output: string; error?: string; operations?: Operation[] }

export const ok = (output: string, operations?: Operation[]): Result =>
  operations ? { output, operations } : { output }
export const err = (error: string): Result => ({ output: "", error })

type FlagDef = { alias?: string; description: string; value?: boolean }
type Handler = (args: string[], flags: Set<string>, stdin: string, flagValues: Record<string, string>) => Result
type CommandDef = {
  description: string
  usage: string
  flags: Record<string, FlagDef>
  handler: (files: Files) => Handler
}

export type Command = CommandDef & {
  createHandler: (files: Files) => (args: string[], stdin: string) => Result
}

export const command = (def: CommandDef): Command => {
  const supported = new Set([
    ...Object.keys(def.flags),
    ...Object.values(def.flags)
      .map((f) => f.alias)
      .filter(Boolean) as string[],
  ])

  const valueFlags = new Set(
    Object.entries(def.flags)
      .filter(([_, f]) => f.value)
      .flatMap(([k, f]) => [k, f.alias].filter(Boolean) as string[])
  )

  const createHandler = (files: Files) => {
    const innerHandler = def.handler(files)

    return (args: string[], stdin: string = ""): Result => {
      const flags = new Set<string>()
      const flagValues: Record<string, string> = {}
      const positional: string[] = []

      for (let i = 0; i < args.length; i++) {
        const arg = args[i]
        if (arg.startsWith("-")) {
          if (!supported.has(arg)) {
            const available = Object.entries(def.flags)
              .map(
                ([f, { alias, description }]) =>
                  `  ${f}${alias ? `, ${alias}` : ""}: ${description}`
              )
              .join("\n")
            return { output: "", error: `Unsupported option: '${arg}'\nSupported:\n${available || "  (none)"}` }
          }
          flags.add(arg)

          let canonical = arg
          for (const [k, { alias }] of Object.entries(def.flags)) {
            if (alias === arg) {
              canonical = k
              flags.add(k)
            }
          }

          if (valueFlags.has(arg) && i + 1 < args.length) {
            flagValues[canonical] = args[++i]
          }
        } else {
          positional.push(arg)
        }
      }

      return innerHandler(positional, flags, stdin, flagValues)
    }
  }

  return Object.assign({ createHandler }, def)
}
