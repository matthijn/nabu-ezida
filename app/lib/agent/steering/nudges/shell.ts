import type { Block, ToolResultBlock } from "../../types"
import { afterToolResult, lastToolResultStatus, findToolCallArgs, withCooldown, type Nudger } from "../nudge-tools"

const shellReminder = `**Shell error** - Review the run_local_shell tool definition for supported commands and syntax.`

const isShellResult = (history: Block[]): boolean => {
  const last = history[history.length - 1]
  return last.type === "tool_result" && (last as { toolName?: string }).toolName === "run_local_shell"
}

const getShellCommands = (history: Block[]): string[] | null => {
  const last = history[history.length - 1]
  if (last.type !== "tool_result") return null
  const callId = (last as ToolResultBlock).callId
  const args = findToolCallArgs(history, callId)
  if (!args) return null
  const commands = args.commands
  return Array.isArray(commands) ? (commands as string[]) : null
}

const extractCommandName = (cmd: string): string => cmd.trim().split(/\s+/)[0] ?? ""

export const buildShellNudge =
  (command: string, prompt: string): Nudger =>
  (history) => {
    if (!afterToolResult(history)) return null
    if (!isShellResult(history)) return null

    const commands = getShellCommands(history)
    if (!commands) return null

    const used = commands.some((cmd) => extractCommandName(cmd) === command)
    return used ? prompt : null
  }

export const shellNudge: Nudger = (history) => {
  if (!afterToolResult(history)) return null
  if (!isShellResult(history)) return null

  const status = lastToolResultStatus(history)
  return status === "error" || status === "partial" ? shellReminder : null
}

const grepReminder = `Reminder: Grep finds strings, not concepts. See <common-mistakes>.`

export const grepNudge = withCooldown(5, buildShellNudge("grep", grepReminder))
