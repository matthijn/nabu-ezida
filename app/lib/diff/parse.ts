type Hunk = {
  oldText: string
  newText: string
}

export type DiffResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

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

    if (!inHunk && (isAddLine(line) || isRemoveLine(line))) {
      inHunk = true
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

const applyHunk = (content: string, hunk: Hunk): DiffResult => {
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

export const applyDiff = (content: string, patch: string): DiffResult => {
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
