type Hunk = {
  oldText: string
  newText: string
}

export type DiffResult =
  | { ok: true; content: string }
  | { ok: false; error: string }

const isHunkStart = (line: string): boolean =>
  line === "@@" || line.startsWith("@@ ") || line === "+@@" || line.startsWith("+@@ ")

const isFileHeader = (line: string): boolean =>
  line.startsWith("*** ")

const isAddLine = (line: string): boolean =>
  line.startsWith("+")

const stripAddPrefix = (line: string): string =>
  line.startsWith("++") ? line.slice(2) : line.slice(1)

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
      currentNew += stripAddPrefix(line) + "\n"
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

const trimLines = (text: string): string =>
  text.split("\n").map(line => line.trim()).join("\n")

const findWithTrimmedMatch = (content: string, oldText: string): string | null => {
  const trimmedOld = trimLines(oldText)
  const contentLines = content.split("\n")
  const oldLines = trimmedOld.split("\n")

  for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
    const slice = contentLines.slice(i, i + oldLines.length)
    if (slice.map(l => l.trim()).join("\n") === trimmedOld) {
      return slice.join("\n")
    }
  }
  return null
}

const applyHunk = (content: string, hunk: Hunk): DiffResult => {
  const oldText = hunk.oldText.replace(/\n$/, "")
  const newText = hunk.newText.replace(/\n$/, "")

  if (oldText === "") {
    const needsSeparator = content.length > 0 && !content.endsWith("\n")
    return { ok: true, content: content + (needsSeparator ? "\n" : "") + newText }
  }

  if (content.includes(oldText)) {
    return { ok: true, content: content.replace(oldText, newText) }
  }

  const actualMatch = findWithTrimmedMatch(content, oldText)
  if (actualMatch) {
    return { ok: true, content: content.replace(actualMatch, trimLines(newText)) }
  }

  return { ok: false, error: `patch context not found: "${oldText.slice(0, 50)}..."` }
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
