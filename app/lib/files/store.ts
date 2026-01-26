import type { DocumentMeta, StoredAnnotation } from "~/domain/attributes"
import type { Annotation } from "~/domain/document/annotations"
import {
  findSingletonBlock,
  findBlocksByLanguage,
  parseBlockJson,
  parseCallout,
  type CalloutBlock,
} from "~/domain/blocks"

type ParsedBlocks = {
  attributes: DocumentMeta | null
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

const notify = (): void => listeners.forEach((l) => l())

const parseFileBlocks = (raw: string): ParsedBlocks => {
  const attributesBlock = findSingletonBlock(raw, "json-attributes")
  const attributes = attributesBlock ? parseBlockJson<DocumentMeta>(attributesBlock) : null

  const calloutBlocks = findBlocksByLanguage(raw, "json-callout")
  const callouts = calloutBlocks
    .map((block) => parseCallout(block.content))
    .filter((c): c is CalloutBlock => c !== null)

  return { attributes, callouts }
}

const createFileEntry = (raw: string): FileEntry => ({
  raw,
  parsed: parseFileBlocks(raw),
})

export const getFiles = (): Files => files

export const getCurrentFile = (): string | null => currentFile

export const getFileRaw = (filename: string): string => files[filename]?.raw ?? ""

export const getFileTags = (filename: string): string[] =>
  files[filename]?.parsed.attributes?.tags ?? []

export const getStoredAnnotations = (filename: string): StoredAnnotation[] =>
  files[filename]?.parsed.attributes?.annotations ?? []

export const getFileCodes = (filename: string): CalloutBlock[] =>
  files[filename]?.parsed.callouts.filter((c) => c.type === "codebook") ?? []

export const getAllCodes = (): CalloutBlock[] =>
  Object.values(files).flatMap((f) => f.parsed.callouts.filter((c) => c.type === "codebook"))

const findCodeById = (id: string): CalloutBlock | undefined =>
  getAllCodes().find((c) => c.id === id)

export const getCodeTitle = (id: string): string | undefined =>
  findCodeById(id)?.title

const calloutToCode = (callout: CalloutBlock): Code => ({
  id: callout.id,
  name: callout.title,
  color: callout.color,
  detail: callout.content,
})

const recomputeCodebook = (): void => {
  const codes = getAllCodes().map(calloutToCode)
  cachedCodebook = codes.length === 0 ? undefined : { categories: [{ name: "Codes", codes }] }
}

export const getCodebook = (): Codebook | undefined => cachedCodebook

const DEFAULT_ANNOTATION_COLOR = "gray"

const resolveAnnotationColor = (annotation: StoredAnnotation): string => {
  if (annotation.color) return annotation.color
  if (annotation.code) return findCodeById(annotation.code)?.color ?? DEFAULT_ANNOTATION_COLOR
  return DEFAULT_ANNOTATION_COLOR
}

const toAnnotation = (stored: StoredAnnotation): Annotation => ({
  text: stored.text,
  color: resolveAnnotationColor(stored),
  reason: stored.reason,
  code: stored.code,
})

export const getFileAnnotations = (filename: string): Annotation[] =>
  getStoredAnnotations(filename).map(toAnnotation)

export const setFiles = (rawFiles: Record<string, { raw: string }>): void => {
  files = Object.fromEntries(
    Object.entries(rawFiles).map(([name, { raw }]) => [name, createFileEntry(raw)])
  )
  recomputeCodebook()
  notify()
}

export const setCurrentFile = (filename: string | null): void => {
  currentFile = filename
  notify()
}

export const updateFileRaw = (filename: string, raw: string): void => {
  files = { ...files, [filename]: createFileEntry(raw) }
  recomputeCodebook()
  notify()
}

export const deleteFile = (filename: string): void => {
  const { [filename]: _, ...rest } = files
  files = rest
  if (currentFile === filename) {
    currentFile = null
  }
  recomputeCodebook()
  notify()
}

export const renameFile = (oldName: string, newName: string): void => {
  const entry = files[oldName]
  if (!entry) return

  const { [oldName]: _, ...rest } = files
  files = { ...rest, [newName]: entry }

  if (currentFile === oldName) {
    currentFile = newName
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
