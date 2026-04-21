import { parseCodeBlocks, collapseBlankLines, formatBlock, type CodeBlock } from "./parse"
import { isSingleton, getSingletonLanguages } from "./registry"

const isSingletonBlock = (block: CodeBlock): boolean => isSingleton(block.language)

const stripBlocks = (content: string, blocks: CodeBlock[]): string => {
  let result = content
  for (let i = blocks.length - 1; i >= 0; i--) {
    result = result.slice(0, blocks[i].start) + result.slice(blocks[i].end)
  }
  return collapseBlankLines(result).trim()
}

const appendInOrder = (prose: string, singletons: CodeBlock[]): string => {
  const byLanguage = new Map(singletons.map((b) => [b.language, b]))
  const parts: string[] = prose ? [prose] : []

  for (const lang of getSingletonLanguages()) {
    const block = byLanguage.get(lang)
    if (block) {
      parts.push(formatBlock(lang, block.content))
    }
  }

  return parts.join("\n\n")
}

export const normalizeSingletonOrder = (content: string): string => {
  const blocks = parseCodeBlocks(content)
  const singletons = blocks.filter(isSingletonBlock)

  if (singletons.length === 0) return content

  const prose = stripBlocks(content, singletons)
  return appendInOrder(prose, singletons)
}
