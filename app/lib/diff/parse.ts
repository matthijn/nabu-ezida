import { findMatches, getMatchedText, type Match } from "./search"
import { expandMatch, countLines } from "./context"

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

const applyHunk = (content: string, hunk: Hunk): DiffResult => {
  const oldText = hunk.oldText.replace(/\n$/, "")
  const newText = hunk.newText.replace(/\n$/, "")

  if (oldText === "") {
    const needsSeparator = content.length > 0 && !content.endsWith("\n")
    return { ok: true, content: content + (needsSeparator ? "\n" : "") + newText }
  }

  const matches = findMatches(content, oldText)

  if (matches.length === 0) {
    return { ok: false, error: `patch context not found: "${oldText.slice(0, 50)}..."` }
  }

  if (matches.length > 1) {
    return { ok: false, error: formatAmbiguousError(content, matches) }
  }

  const matchedText = getMatchedText(content, matches[0])
  return { ok: true, content: content.replace(matchedText, newText) }
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

const CONTEXT_LINES = 3

const formatAmbiguousError = (content: string, matches: Match[]): string => {
  const total = countLines(content)
  const expanded = matches.map((m, i) => {
    const exp = expandMatch(m, CONTEXT_LINES, total)
    const text = getMatchedText(content, exp)
    return `Match ${i + 1}:\n───\n${text}\n───`
  })

  return [
    `patch ambiguous: ${matches.length} matches found`,
    "",
    ...expanded,
    "",
    "Include more surrounding lines to disambiguate. If none look right, verify you're targeting the correct location.",
  ].join("\n")
}
