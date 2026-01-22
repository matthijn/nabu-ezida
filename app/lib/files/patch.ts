import { validateDocumentMeta, type ValidationIssue } from "~/domain/sidecar"

type Hunk = {
  oldText: string
  newText: string
}

type PatchResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

export type FileResult =
  | { path: string; status: "ok"; content: string }
  | { path: string; status: "error"; error: string }
  | { path: string; status: "validation_error"; issues: ValidationIssue[]; current: Record<string, unknown> }

export type MultiPatchResult = {
  results: FileResult[]
}

const hasHeaders = (patch: string): boolean =>
  patch.includes("*** Add File:") || patch.includes("*** Update File:") || patch.startsWith("@@@")

const parseRawDiff = (patch: string): Hunk[] => {
  const lines = patch.split("\n")
  let oldText = ""
  let newText = ""

  for (const line of lines) {
    if (line.startsWith("-")) {
      oldText += line.slice(1) + "\n"
    } else if (line.startsWith("+")) {
      newText += line.slice(1) + "\n"
    } else if (line.startsWith(" ")) {
      oldText += line.slice(1) + "\n"
      newText += line.slice(1) + "\n"
    }
  }

  return oldText || newText ? [{ oldText, newText }] : []
}

const parseHeaderedPatch = (patch: string): Hunk[] => {
  const lines = patch.split("\n")
  const hunks: Hunk[] = []
  let currentOld = ""
  let currentNew = ""
  let inHunk = false
  let isAddFile = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === "*** Begin Patch" || trimmed === "*** End Patch") {
      continue
    }
    if (trimmed.startsWith("*** Delete File:")) {
      continue
    }
    if (trimmed.startsWith("*** Update File:")) {
      isAddFile = false
      continue
    }
    if (trimmed.startsWith("*** Add File:")) {
      isAddFile = true
      inHunk = true
      continue
    }
    if (line.startsWith("@@@")) {
      if (inHunk) {
        hunks.push({ oldText: currentOld, newText: currentNew })
        currentOld = ""
        currentNew = ""
      }
      inHunk = true
      isAddFile = false
      continue
    }

    if (!inHunk) {
      continue
    }

    if (line.startsWith("-")) {
      currentOld += line.slice(1) + "\n"
    } else if (line.startsWith("+")) {
      currentNew += line.slice(1) + "\n"
    } else if (!isAddFile && (line.startsWith(" ") || line === "")) {
      const text = line.startsWith(" ") ? line.slice(1) : line
      currentOld += text + "\n"
      currentNew += text + "\n"
    }
  }

  if (inHunk) {
    hunks.push({ oldText: currentOld, newText: currentNew })
  }

  return hunks
}

const parsePatch = (patch: string): Hunk[] =>
  hasHeaders(patch) ? parseHeaderedPatch(patch) : parseRawDiff(patch)

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
  const hunks = parsePatch(patch)
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

  return { path, status: "ok", content: patchResult.content }
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
