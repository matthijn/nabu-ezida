import type { ScoutMap, ScoutSection } from "../scout-map"
import { parseBlockJson, parseCodeBlocks, type CodeBlock } from "~/lib/data-blocks/parse"
import { resolveBlockId, resolveBlockLabel } from "~/lib/data-blocks/registry"

export interface CodeblockMarker {
  language: string
  id: string | null
  label: string | null
  line: number
}

export interface ProseMap {
  prose: string
  proseToOrig: number[]
  codeblocks: CodeblockMarker[]
}

const blockStartLine = (content: string, block: CodeBlock): number =>
  content.slice(0, block.start).split("\n").length

interface BlockIdentity {
  id: string | null
  label: string | null
}

const resolveBlockIdentity = (block: CodeBlock): BlockIdentity => {
  const parsed = parseBlockJson<Record<string, unknown>>(block)
  if (!parsed.ok) return { id: null, label: null }
  return {
    id: resolveBlockId(block.language, parsed.data),
    label: resolveBlockLabel(block.language, parsed.data),
  }
}

const toMarker = (content: string, block: CodeBlock): CodeblockMarker => ({
  language: block.language,
  ...resolveBlockIdentity(block),
  line: blockStartLine(content, block),
})

const SPLIT_MARKER = "#SPLIT"

const isWithinAny = (blocks: CodeBlock[], lineStart: number, lineEnd: number): boolean =>
  blocks.some((b) => b.start <= lineStart && lineEnd <= b.end)

const findBlockOpeningAt = (blocks: CodeBlock[], lineStart: number): CodeBlock | undefined =>
  blocks.find((b) => b.start === lineStart)

export const buildProseWithLineMap = (content: string): ProseMap => {
  const blocks = parseCodeBlocks(content)
  const lines = content.split("\n")

  const proseLines: string[] = []
  const proseToOrig: number[] = []
  let offset = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineStart = offset
    const lineEnd = offset + line.length

    if (findBlockOpeningAt(blocks, lineStart)) {
      proseLines.push(SPLIT_MARKER)
      proseToOrig.push(i + 1)
    } else if (!isWithinAny(blocks, lineStart, lineEnd)) {
      proseLines.push(line)
      proseToOrig.push(i + 1)
    }

    offset = lineEnd + 1
  }

  return {
    prose: proseLines.join("\n"),
    proseToOrig,
    codeblocks: blocks.map((b) => toMarker(content, b)),
  }
}

export const translateSections = (
  sections: ScoutSection[],
  proseToOrig: number[],
  totalOrigLines: number
): ScoutSection[] => {
  const origStarts = sections.map((s) => proseToOrig[s.start_line - 1])
  return sections.map((s, i) => ({
    ...s,
    start_line: origStarts[i],
    end_line: (origStarts[i + 1] ?? totalOrigLines + 1) - 1,
  }))
}

const formatCodeblockMarker = (m: CodeblockMarker): string => {
  const id = m.id ? ` ${m.id}` : ""
  const label = m.label ? `: "${m.label}"` : ""
  return `codeblock ${m.language}${id}${label} on line ${m.line}`
}

const formatSection = (section: ScoutSection): string => {
  const header = `[${section.start_line}-${section.end_line}] ${section.label}`
  const keywords = `  keywords: ${section.keywords.join(", ")}`
  const desc = section.desc ? `  desc: ${section.desc}` : null
  return [header, keywords, desc].filter((l): l is string => l !== null).join("\n")
}

const formatCodeblockAppendix = (codeblocks: CodeblockMarker[]): string | null => {
  if (codeblocks.length === 0) return null
  return `----\n${codeblocks.map(formatCodeblockMarker).join("\n")}`
}

export const formatScoutMap = (
  path: string,
  map: ScoutMap,
  codeblocks: CodeblockMarker[]
): string => {
  const header = `File: ${path}\n${map.file_context}`
  const body = map.sections.map(formatSection).join("\n\n")
  const appendix = formatCodeblockAppendix(codeblocks)
  return [header, body, appendix].filter((p): p is string => p !== null).join("\n\n")
}
