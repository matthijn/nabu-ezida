type Hunk = {
  oldText: string
  newText: string
}

type PatchResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

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
