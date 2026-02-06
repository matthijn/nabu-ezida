import { generateDiff } from "~/lib/diff"
import { applyFilePatch, updateFileRaw, getFiles } from "~/lib/files"
import { deduplicateName } from "./dedupe"
import { readFileContent, isMarkdownFile } from "./read"
import type { ImportFile, ImportStatus } from "./types"

export type ProcessResult = {
  status: ImportStatus
  error?: string
  finalPath?: string
}

type StatusCallback = (id: string, status: ImportStatus, extra?: Partial<ImportFile>) => void

const ATTRIBUTES_BLOCK_REGEX = /```json-attributes\n([\s\S]*?)\n```/

const createAttributesBlock = (tags: string[]): string =>
  `\`\`\`json-attributes\n${JSON.stringify({ tags }, null, 2)}\n\`\`\``

const injectTags = (content: string, tags: string[]): string => {
  if (tags.length === 0) return content

  const match = content.match(ATTRIBUTES_BLOCK_REGEX)
  if (!match) {
    return `${content}\n\n${createAttributesBlock(tags)}`
  }

  try {
    const existing = JSON.parse(match[1]) as { tags?: string[] }
    const merged = [...new Set([...(existing.tags ?? []), ...tags])]
    const updated = JSON.stringify({ ...existing, tags: merged }, null, 2)
    return content.replace(ATTRIBUTES_BLOCK_REGEX, `\`\`\`json-attributes\n${updated}\n\`\`\``)
  } catch {
    return content
  }
}

const getExistingNames = (): Set<string> => new Set(Object.keys(getFiles()))

const processMarkdownFile = (
  file: File,
  content: string,
  tags: string[]
): ProcessResult => {
  const existingNames = getExistingNames()
  const finalPath = deduplicateName(file.name, existingNames)
  const contentWithTags = injectTags(content, tags)
  const diff = generateDiff("", contentWithTags)

  const result = applyFilePatch(finalPath, "", diff)

  if (result.status === "error") {
    return { status: "error", error: result.error }
  }

  updateFileRaw(result.path, result.content)

  return { status: "completed", finalPath }
}

export const processFile = async (
  file: File,
  onStatus: StatusCallback,
  tags: string[] = []
): Promise<void> => {
  const id = file.name

  if (!isMarkdownFile(file.name)) {
    onStatus(id, "unsupported")
    return
  }

  onStatus(id, "reading")

  const readResult = await readFileContent(file)

  if (!readResult.ok) {
    onStatus(id, "error", { error: readResult.error })
    return
  }

  onStatus(id, "processing")

  const processResult = processMarkdownFile(file, readResult.content, tags)

  onStatus(id, processResult.status, {
    error: processResult.error,
    finalPath: processResult.finalPath,
  })
}

type FileWithTags = { file: File; tags: string[] }

export const processFiles = async (
  files: FileWithTags[],
  onStatus: StatusCallback
): Promise<void> => {
  for (const { file, tags } of files) {
    await processFile(file, onStatus, tags)
  }
}
