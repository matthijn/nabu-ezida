import { parseCodeBlocks } from "~/lib/data-blocks/parse"
import { stripMarkdownFormatting } from "./strip"

type ToProseFn = (block: unknown) => string | null

interface Region {
  type: "prose" | "code"
  text: string
  language?: string
  content?: string
}

const buildRegions = (markdown: string): Region[] => {
  const codeBlocks = parseCodeBlocks(markdown)
  const regions: Region[] = []
  let cursor = 0

  for (const block of codeBlocks) {
    if (block.start > cursor) {
      regions.push({ type: "prose", text: markdown.slice(cursor, block.start) })
    }
    regions.push({ type: "code", text: "", language: block.language, content: block.content })
    cursor = block.end
  }

  if (cursor < markdown.length) {
    regions.push({ type: "prose", text: markdown.slice(cursor) })
  }

  return regions
}

const processRegion = (region: Region, toProseFns: Record<string, ToProseFn>): string => {
  if (region.type === "prose") return stripMarkdownFormatting(region.text)

  const fn = region.language ? toProseFns[region.language] : undefined
  if (!fn || !region.content) return ""

  try {
    const parsed = JSON.parse(region.content)
    return fn(parsed) ?? ""
  } catch {
    return ""
  }
}

const collapseWhitespace = (text: string): string => text.replace(/\n{3,}/g, "\n\n").trim()

export const toEmbeddableText = (
  markdown: string,
  toProseFns: Record<string, ToProseFn>
): string => {
  const regions = buildRegions(markdown)
  const parts = regions.map((r) => processRegion(r, toProseFns))
  return collapseWhitespace(parts.join(""))
}
