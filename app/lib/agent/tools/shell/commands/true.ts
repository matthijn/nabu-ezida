import { command, ok, err } from "./command"

export const trueCmd = command({
  description: "Return success",
  usage: "true",
  flags: {},
  handler: () => () => ok(""),
})

export const falseCmd = command({
  description: "Return failure",
  usage: "false",
  flags: {},
  handler: () => () => err(""),
})
