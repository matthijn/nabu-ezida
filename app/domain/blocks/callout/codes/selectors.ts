import type { CalloutBlock } from "../schema"
import { getCallouts } from "../selectors"
import { toDisplayName } from "~/lib/files/filename"

export interface Code {
  id: string
  name: string
  color: string
  detail: string
}

export interface CodeGroup {
  fileId: string
  name: string
  codes: Code[]
}

export interface Codebook {
  categories: CodeGroup[]
}

export const getCodes = (raw: string): CalloutBlock[] =>
  getCallouts(raw).filter((c) => c.type === "codebook-code")

export const getAllCodes = (files: Record<string, string>): CalloutBlock[] =>
  Object.values(files).flatMap(getCodes)

export const findCodeById = (files: Record<string, string>, id: string): CalloutBlock | undefined =>
  getAllCodes(files).find((c) => c.id === id)

export const getCodeTitle = (files: Record<string, string>, id: string): string | undefined =>
  findCodeById(files, id)?.title

const calloutToCode = (callout: CalloutBlock): Code => ({
  id: callout.id,
  name: callout.title,
  color: callout.color,
  detail: callout.content,
})

const groupCodesByFile = (files: Record<string, string>): CodeGroup[] =>
  Object.entries(files).reduce<CodeGroup[]>((acc, [filename, raw]) => {
    const codes = getCodes(raw).map(calloutToCode)
    if (codes.length > 0) acc.push({ fileId: filename, name: toDisplayName(filename), codes })
    return acc
  }, [])

export const getCodebook = (files: Record<string, string>): Codebook | undefined => {
  const categories = groupCodesByFile(files)
  return categories.length === 0 ? undefined : { categories }
}
