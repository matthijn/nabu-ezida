import { validateDocumentMeta, type ValidationIssue, type DocumentMeta } from "~/domain/sidecar"

type Hunk = {
  oldText: string
  newText: string
}

type PatchResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

export type FileResult =
  | { path: string; status: "ok"; content: string; parsed?: DocumentMeta }
  | { path: string; status: "error"; error: string }
  | { path: string; status: "validation_error"; issues: ValidationIssue[]; current: Record<string, unknown> }

export type MultiPatchResult = {
  results: FileResult[]
}

const isHunkStart = (line: string): boolean =>
  line === "@@" || line.startsWith("@@ ")

const isFileHeader = (line: string): boolean =>
  line.startsWith("*** ")

const isAddLine = (line: string): boolean =>
  line.startsWith("+")

const isRemoveLine = (line: string): boolean =>
  line.startsWith("-")

const parseV4ADiff = (patch: string): Hunk[] => {
  const lines = patch.split("\n")
  const hunks: Hunk[] = []
  let currentOld = ""
  let currentNew = ""
  let inHunk = false
  let isAddFile = false

  const flushHunk = () => {
    if (inHunk && (currentOld || currentNew)) {
      hunks.push({ oldText: currentOld, newText: currentNew })
    }
    currentOld = ""
    currentNew = ""
  }

  for (const line of lines) {
    if (line.startsWith("*** Add File:")) {
      flushHunk()
      isAddFile = true
      inHunk = true
      continue
    }

    if (line.startsWith("*** Update File:") || line.startsWith("*** Delete File:")) {
      flushHunk()
      isAddFile = false
      inHunk = false
      continue
    }

    if (isHunkStart(line)) {
      flushHunk()
      inHunk = true
      isAddFile = false
      continue
    }

    if (isFileHeader(line)) {
      continue
    }

    if (!inHunk) {
      continue
    }

    if (isRemoveLine(line)) {
      currentOld += line.slice(1) + "\n"
    } else if (isAddLine(line)) {
      currentNew += line.slice(1) + "\n"
    } else if (!isAddFile) {
      currentOld += line + "\n"
      currentNew += line + "\n"
    } else {
      currentNew += line + "\n"
    }
  }

  flushHunk()
  return hunks
}

const applyHunk = (content: string, hunk: Hunk): PatchResult => {
  const oldText = hunk.oldText.replace(/\n$/, "")
  const newText = hunk.newText.replace(/\n$/, "")

  if (oldText === "") {
    return { ok: true, content: content + newText }
  }

  if (!content.includes(oldText)) {
    return { ok: false, error: `patch context not found: "${oldText.slice(0, 50)}..."` }
  }

  return { ok: true, content: content.replace(oldText, newText) }
}

export const applyPatch = (content: string, patch: string): PatchResult => {
  const hunks = parseV4ADiff(patch)
  let result = content

  for (const hunk of hunks) {
    const applied = applyHunk(result, hunk)
    if (!applied.ok) {
      return applied
    }
    result = applied.content
  }

  return { ok: true, content: result }
}

const isJsonFile = (path: string): boolean =>
  path.endsWith(".json")

const parseJson = (content: string): { ok: true; data: unknown } | { ok: false; error: string } => {
  try {
    return { ok: true, data: JSON.parse(content) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}

const applyJsonPatch = (path: string, content: string, patch: string): FileResult => {
  const patchResult = applyPatch(content, patch)
  if (!patchResult.ok) {
    return { path, status: "error", error: patchResult.error }
  }

  const parseResult = parseJson(patchResult.content)
  if (!parseResult.ok) {
    return { path, status: "error", error: parseResult.error }
  }

  const validation = validateDocumentMeta(parseResult.data)
  if (!validation.success) {
    return {
      path,
      status: "validation_error",
      issues: validation.issues,
      current: validation.current,
    }
  }

  return { path, status: "ok", content: patchResult.content, parsed: validation.data }
}

const applyMdPatch = (path: string, content: string, patch: string): FileResult => {
  const result = applyPatch(content, patch)
  if (!result.ok) {
    return { path, status: "error", error: result.error }
  }
  return { path, status: "ok", content: result.content }
}

export const applyFilePatch = (path: string, content: string, patch: string): FileResult =>
  isJsonFile(path)
    ? applyJsonPatch(path, content, patch)
    : applyMdPatch(path, content, patch)

export type FilePatch = {
  path: string
  content: string
  patch: string
}

export const applyFilePatches = (patches: FilePatch[]): MultiPatchResult => ({
  results: patches.map(({ path, content, patch }) => applyFilePatch(path, content, patch)),
})
