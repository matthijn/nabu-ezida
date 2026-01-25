import type { DocumentMeta } from "~/domain/sidecar"
import {
  findSingletonBlock,
  findBlocksByLanguage,
  parseBlockJson,
  CalloutSchema,
  type CalloutBlock,
} from "~/domain/blocks"

type ParsedBlocks = {
  sidecar: DocumentMeta | null
  callouts: CalloutBlock[]
}

export type FileEntry = {
  raw: string
  parsed: ParsedBlocks
}

type Files = Record<string, FileEntry>
type Listener = () => void
type Code = { id: string; name: string; color: string; detail: string }
type Codebook = { categories: { name: string; codes: Code[] }[] }

const STORAGE_KEY = "nabu:files"

let files: Files = {}
let currentFile: string | null = null
let cachedCodebook: Codebook | undefined = undefined
const listeners = new Set<Listener>()

const calloutToCode = (callout: CalloutBlock): Code => ({
  id: callout.id,
  name: callout.title,
  color: callout.color,
  detail: callout.content,
})

const recomputeCodebook = (): void => {
  const codes = Object.values(files)
    .flatMap((f) => f.parsed.callouts.filter((c) => c.type === "codebook"))
    .map(calloutToCode)
  cachedCodebook = codes.length === 0 ? undefined : { categories: [{ name: "Codes", codes }] }
}

const notify = (): void => {
  recomputeCodebook()
  listeners.forEach((l) => l())
}

const parseFileBlocks = (raw: string): ParsedBlocks => {
  const sidecarBlock = findSingletonBlock(raw, "json-attributes")
  const sidecar = sidecarBlock ? parseBlockJson<DocumentMeta>(sidecarBlock) : null

  const calloutBlocks = findBlocksByLanguage(raw, "json-callout")
  const callouts = calloutBlocks
    .map((block) => {
      const result = CalloutSchema.safeParse(JSON.parse(block.content))
      return result.success ? result.data : null
    })
    .filter((c): c is CalloutBlock => c !== null)

  return { sidecar, callouts }
}

const createFileEntry = (raw: string): FileEntry => ({
  raw,
  parsed: parseFileBlocks(raw),
})

export const getFiles = (): Files => files

export const getCurrentFile = (): string | null => currentFile

export const getFileRaw = (filename: string): string => files[filename]?.raw ?? ""

export const getFileTags = (filename: string): string[] =>
  files[filename]?.parsed.sidecar?.tags ?? []

export const getFileAnnotations = (filename: string): DocumentMeta["annotations"] =>
  files[filename]?.parsed.sidecar?.annotations ?? []

export const getFileCodes = (filename: string): CalloutBlock[] =>
  files[filename]?.parsed.callouts.filter((c) => c.type === "codebook") ?? []

export const getAllCodes = (): CalloutBlock[] =>
  Object.values(files).flatMap((f) => f.parsed.callouts.filter((c) => c.type === "codebook"))

export const getCodebook = (): Codebook | undefined => cachedCodebook

export const setFiles = (rawFiles: Record<string, { raw: string }>): void => {
  files = Object.fromEntries(
    Object.entries(rawFiles).map(([name, { raw }]) => [name, createFileEntry(raw)])
  )
  notify()
}

export const setCurrentFile = (filename: string | null): void => {
  currentFile = filename
  notify()
}

export const updateFileRaw = (filename: string, raw: string): void => {
  files = { ...files, [filename]: createFileEntry(raw) }
  notify()
}

export const deleteFile = (filename: string): void => {
  const { [filename]: _, ...rest } = files
  files = rest
  if (currentFile === filename) {
    currentFile = null
  }
  notify()
}

export const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const persistFiles = (): void => {
  try {
    const rawOnly = Object.fromEntries(
      Object.entries(files).map(([name, { raw }]) => [name, { raw }])
    )
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rawOnly))
  } catch {
    // localStorage full or unavailable
  }
}

export const restoreFiles = (): void => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const rawFiles = JSON.parse(stored) as Record<string, { raw: string }>
      setFiles(rawFiles)
    }
  } catch {
    // parse error or localStorage unavailable
  }
}
