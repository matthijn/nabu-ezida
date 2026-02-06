export type CodeBlock = {
  language: string
  content: string
  start: number
  end: number
}

const CODE_BLOCK_REGEX = /```(\S+)[ \t]*\r?\n([\s\S]*?)```/g

export const parseCodeBlocks = (markdown: string): CodeBlock[] => {
  const blocks: CodeBlock[] = []
  let match: RegExpExecArray | null

  while ((match = CODE_BLOCK_REGEX.exec(markdown)) !== null) {
    blocks.push({
      language: match[1],
      content: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
    })
  }

  return blocks
}

export const findBlocksByLanguage = (markdown: string, language: string): CodeBlock[] =>
  parseCodeBlocks(markdown).filter((b) => b.language === language)

export const findSingletonBlock = (markdown: string, language: string): CodeBlock | undefined =>
  findBlocksByLanguage(markdown, language)[0]

export const countBlocksByLanguage = (markdown: string, language: string): number =>
  findBlocksByLanguage(markdown, language).length

export const parseBlockJson = <T>(block: CodeBlock): T | null => {
  try {
    return JSON.parse(block.content) as T
  } catch {
    return null
  }
}

const formatBlock = (language: string, content: string): string =>
  `\`\`\`${language}\n${content}\n\`\`\``

export const replaceSingletonBlock = (
  markdown: string,
  language: string,
  newContent: string
): string => {
  const block = findSingletonBlock(markdown, language)
  const formatted = formatBlock(language, newContent)

  if (block) {
    return markdown.slice(0, block.start) + formatted + markdown.slice(block.end)
  }

  return markdown.trimEnd() + "\n\n" + formatted
}
