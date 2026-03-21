import { command, ok } from "./command"

const hasNoNewlineFlag = (args: string[]): boolean => args[0] === "-n"

const stripNoNewlineFlag = (args: string[]): string[] =>
  hasNoNewlineFlag(args) ? args.slice(1) : args

export const echo = command({
  description: "Print text",
  usage: "echo [-n] [text...]",
  flags: {
    "-n": { description: "no trailing newline" },
  },
  skipFlagParsing: true,
  handler: () => (args) => ok(stripNoNewlineFlag(args).join(" ")),
})
