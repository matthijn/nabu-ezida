import { command, ok } from "./command"

export const echo = command({
  description: "Print text",
  usage: "echo [text...]",
  flags: {
    "-n": { description: "no trailing newline" },
  },
  handler: () => (args) => ok(args.join(" ")),
})
