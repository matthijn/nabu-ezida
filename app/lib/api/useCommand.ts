import { useCallback } from "react"
import { toast } from "sonner"
import {
  sendCommand,
  isCommandError,
  formatCommandError,
  formatNetworkError,
  type Command,
  type CommandResult,
} from "./client"

export const useCommand = () => {
  const execute = useCallback(async (command: Command): Promise<CommandResult | null> => {
    try {
      return await sendCommand(command)
    } catch (error) {
      if (isCommandError(error)) {
        const { title, description } = formatCommandError(error)
        toast.error(title, { description })
      } else {
        const { title, description } = formatNetworkError()
        toast.error(title, { description })
      }
      return null
    }
  }, [])

  return { execute }
}
