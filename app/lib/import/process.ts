import { generateDiff } from "~/lib/diff"
import { applyFilePatch, updateFileRaw, getFiles } from "~/lib/files"
import { sendCommand, type Command } from "~/lib/sync"
import { deduplicateName } from "./dedupe"
import { readFileContent, isMarkdownFile } from "./read"
import type { ImportFile, ImportStatus } from "./types"

export type ProcessResult = {
  status: ImportStatus
  error?: string
  finalPath?: string
}

type StatusCallback = (id: string, status: ImportStatus, extra?: Partial<ImportFile>) => void

const getExistingNames = (): Set<string> => new Set(Object.keys(getFiles()))

const createFileOnServer = (projectId: string, path: string, diff: string): void => {
  const command: Command = { action: "CreateFile", path, diff }
  sendCommand(projectId, command).catch(() => {})
}

const processMarkdownFile = (
  file: File,
  content: string,
  projectId: string | undefined
): ProcessResult => {
  const existingNames = getExistingNames()
  const finalPath = deduplicateName(file.name, existingNames)
  const diff = generateDiff("", content)

  const result = applyFilePatch(finalPath, "", diff)

  if (result.status === "error") {
    return { status: "error", error: result.error }
  }

  updateFileRaw(result.path, result.content)

  if (projectId) {
    createFileOnServer(projectId, finalPath, diff)
  }

  return { status: "completed", finalPath }
}

export const processFile = async (
  file: File,
  projectId: string | undefined,
  onStatus: StatusCallback
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

  const processResult = processMarkdownFile(file, readResult.content, projectId)

  onStatus(id, processResult.status, {
    error: processResult.error,
    finalPath: processResult.finalPath,
  })
}

export const processFiles = async (
  files: File[],
  projectId: string | undefined,
  onStatus: StatusCallback
): Promise<void> => {
  for (const file of files) {
    await processFile(file, projectId, onStatus)
  }
}
