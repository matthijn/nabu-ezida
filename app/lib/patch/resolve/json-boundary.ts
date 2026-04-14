import { parseCodeBlocks } from "~/lib/data-blocks/parse"

const isJsonBlock = (language: string): boolean => language.startsWith("json-")

const BOUNDARY_COMMENT = /^\/\/ (?:start|end) json-\S+.*$/

const extractId = (content: string): string | undefined => {
  try {
    const parsed = JSON.parse(content)
    return typeof parsed?.id === "string" ? parsed.id : undefined
  } catch {
    return undefined
  }
}

const buildComment = (language: string, id: string | undefined, edge: "start" | "end"): string =>
  id ? `// ${edge} ${language} ${id}` : `// ${edge} ${language}`

export const injectBoundaryComments = (markdown: string): string => {
  const blocks = parseCodeBlocks(markdown).filter((b) => isJsonBlock(b.language))
  if (blocks.length === 0) return markdown

  let result = markdown
  let offset = 0

  for (const block of blocks) {
    const id = extractId(block.content)
    const start = buildComment(block.language, id, "start")
    const end = buildComment(block.language, id, "end")
    const newContent = `${start}\n${block.content}\n${end}`

    const fenceOpen = `\`\`\`${block.language}\n`
    const fenceClose = `\n\`\`\``
    const original = result.slice(block.start + offset, block.end + offset)
    const replaced = `${fenceOpen}${newContent}${fenceClose}`

    result = result.slice(0, block.start + offset) + replaced + result.slice(block.end + offset)
    offset += replaced.length - original.length
  }

  return result
}

export const stripBoundaryComments = (markdown: string): string =>
  markdown
    .split("\n")
    .filter((line) => !BOUNDARY_COMMENT.test(line.trim()))
    .join("\n")
