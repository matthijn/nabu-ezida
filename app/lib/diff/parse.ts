import { findMatches, getMatchedText, type Match } from "./search"
import { expandMatch, countLines } from "./context"

type HunkPart =
  | { type: "context"; content: string }
  | { type: "remove"; content: string }
  | { type: "add"; content: string }

type Hunk = {
  parts: HunkPart[]
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


const stripTrailingSplitArtifact = (lines: string[]): string[] =>
  lines.length > 0 && lines[lines.length - 1] === "" ? lines.slice(0, -1) : lines

const parseV4ADiff = (patch: string): Hunk[] => {
  const lines = stripTrailingSplitArtifact(patch.split("\n"))
  const hunks: Hunk[] = []
  let currentParts: HunkPart[] = []
  let inHunk = false
  let isAddFile = false

  const flushHunk = () => {
    if (inHunk && currentParts.length > 0) {
      hunks.push({ parts: currentParts })
    }
    currentParts = []
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
      currentParts.push({ type: "remove", content: line.slice(1) + "\n" })
    } else if (isAddLine(line)) {
      currentParts.push({ type: "add", content: stripAddPrefix(line) + "\n" })
    } else if (!isAddFile) {
      // Context line - no prefix in v4a format, use verbatim
      currentParts.push({ type: "context", content: line + "\n" })
    } else {
      currentParts.push({ type: "add", content: line + "\n" })
    }
  }

  flushHunk()
  return hunks
}

const buildMatchText = (parts: HunkPart[]): string =>
  parts
    .filter((p) => p.type === "context" || p.type === "remove")
    .map((p) => p.content)
    .join("")
    .replace(/\n$/, "")

const buildAddText = (parts: HunkPart[]): string =>
  parts
    .filter((p) => p.type === "add")
    .map((p) => p.content)
    .join("")
    .replace(/\n$/, "")

const buildReplacement = (parts: HunkPart[], matchedText: string): string => {
  let offset = 0
  const result: string[] = []

  for (const part of parts) {
    if (part.type === "context" || part.type === "remove") {
      const len = part.content.length
      if (part.type === "context") {
        // Output from matchedText to preserve original (handles whitespace differences)
        result.push(matchedText.slice(offset, offset + len))
      }
      // For remove, skip output but advance offset
      offset += len
    } else if (part.type === "add") {
      result.push(part.content)
    }
  }

  return result.join("").replace(/\n$/, "")
}

const applyHunk = (content: string, hunk: Hunk): DiffResult => {
  const matchText = buildMatchText(hunk.parts)

  // Pure addition (no context, no remove) - append to content
  if (matchText === "") {
    const addText = buildAddText(hunk.parts)
    const needsSeparator = content.length > 0 && !content.endsWith("\n")
    return { ok: true, content: content + (needsSeparator ? "\n" : "") + addText }
  }

  const matches = findMatches(content, matchText)

  if (matches.length === 0) {
    return {
      ok: false,
      error: `patch context not found:\n  searching for: "${matchText}"\n  in content: "${content}"`,
    }
  }

  if (matches.length > 1) {
    return { ok: false, error: formatAmbiguousError(content, matches) }
  }

  const matchedText = getMatchedText(content, matches[0])
  const newText = buildReplacement(hunk.parts, matchedText)
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
