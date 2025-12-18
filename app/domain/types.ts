import type { Command, CommandResult } from "./api"

export type Domain = {
  dispatch: (command: Command) => void
  sendCommand: (command: Command) => Promise<CommandResult>
}
