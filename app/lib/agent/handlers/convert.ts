import type { Handler } from "../types"

export const convert: Handler = async (_deps, args) => {
  const kind = args.kind as string
  const data = args.data as unknown
  console.log(`[Convert] ${kind}:`, data)
  // TODO: update document.parsed[kind] = data
  return { success: true, kind, data }
}

export const removeConversion: Handler = async (_deps, args) => {
  const kind = args.kind as string
  console.log(`[Convert] remove ${kind}`)
  // TODO: delete document.parsed[kind]
  return { success: true, kind }
}
