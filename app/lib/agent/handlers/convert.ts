import type { Handler } from "../types"
import { setParsed, removeParsed } from "~/lib/services/projectSync"

export const convert: Handler = async (_deps, args) => {
  const kind = args.kind as string
  const data = args.data as unknown
  setParsed(kind, data)
  return { success: true, kind }
}

export const removeConversion: Handler = async (_deps, args) => {
  const kind = args.kind as string
  removeParsed(kind)
  return { success: true, kind }
}
