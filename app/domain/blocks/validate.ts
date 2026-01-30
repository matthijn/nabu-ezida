import { getBlockConfig, isSingleton, getImmutableFields, type ValidationContext } from "./registry"
import { parseCodeBlocks, countBlocksByLanguage, type CodeBlock } from "./parse"

export type ValidationError = {
  block: string
  field?: string
  message: string
  currentBlock?: string
  hint?: Record<string, string>
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

const formatBlock = (language: string, content: string): string =>
  `\`\`\`${language}\n${content}\n\`\`\``

const extractProse = (markdown: string): string => {
  const blocks = parseCodeBlocks(markdown)
  let prose = markdown

  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i]
    prose = prose.slice(0, block.start) + prose.slice(block.end)
  }

  return prose
}

const validateBlockSchema = (language: string, content: string): ValidationError[] => {
  const config = getBlockConfig(language)
  if (!config) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch (e) {
    const reason = e instanceof SyntaxError ? e.message : "Unknown error"
    return [{ block: language, message: `Invalid JSON: ${reason}` }]
  }

  const result = config.schema.safeParse(parsed)
  if (!result.success) {
    return result.error.issues.map((issue) => ({
      block: language,
      field: issue.path.join("."),
      message: issue.message,
    }))
  }

  return []
}

const validateBlockSemantic = (
  language: string,
  content: string,
  context: ValidationContext
): ValidationError[] => {
  const config = getBlockConfig(language)
  if (!config?.validate) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(content)
  } catch {
    return []
  }

  return config.validate(parsed, context)
}

const validateSingletons = (markdown: string): ValidationError[] => {
  const blocks = parseCodeBlocks(markdown)
  const errors: ValidationError[] = []
  const seen = new Set<string>()

  for (const block of blocks) {
    if (isSingleton(block.language)) {
      if (seen.has(block.language)) {
        errors.push({
          block: block.language,
          message: `Only one ${block.language} block allowed per file`,
        })
      }
      seen.add(block.language)
    }
  }

  return errors
}

type BlocksByLanguage = Record<string, CodeBlock[]>

const groupBlocksByLanguage = (blocks: CodeBlock[]): BlocksByLanguage =>
  blocks.reduce<BlocksByLanguage>((acc, block) => {
    const list = acc[block.language] ?? []
    return { ...acc, [block.language]: [...list, block] }
  }, {})

const tryParseJson = (content: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

const getBlockId = (block: CodeBlock): string | null =>
  tryParseJson(block.content)?.id as string | null

type FindBlockResult =
  | { found: true; block: CodeBlock }
  | { found: false; error: ValidationError }

const findOriginalBlock = (
  block: CodeBlock,
  originalBlocksByLanguage: BlocksByLanguage
): FindBlockResult => {
  const originalBlocks = originalBlocksByLanguage[block.language] ?? []

  if (isSingleton(block.language)) {
    return originalBlocks[0]
      ? { found: true, block: originalBlocks[0] }
      : { found: false, error: { block: block.language, message: "No original block found" } }
  }

  const id = getBlockId(block)
  if (!id) {
    return {
      found: false,
      error: {
        block: block.language,
        message: `Block of type ${block.language} is missing identifier. Add an "id" field.`,
      },
    }
  }

  const original = originalBlocks.find((b) => getBlockId(b) === id)
  return original
    ? { found: true, block: original }
    : { found: false, error: { block: block.language, message: `No original block found with id "${id}"` } }
}

const DEFAULT_IMMUTABLE_MESSAGE = (field: string) => `Field "${field}" is immutable and cannot be changed`

const validateImmutableFields = (
  language: string,
  newBlock: CodeBlock,
  originalBlock: CodeBlock
): ValidationError[] => {
  const newParsed = tryParseJson(newBlock.content)
  const originalParsed = tryParseJson(originalBlock.content)

  if (!newParsed || !originalParsed) return []

  const errors: ValidationError[] = []
  const configImmutable = getImmutableFields(language)
  const immutableFields: Record<string, string> = originalParsed.id
    ? { id: DEFAULT_IMMUTABLE_MESSAGE("id"), ...configImmutable }
    : configImmutable

  for (const [field, message] of Object.entries(immutableFields)) {
    const originalValue = originalParsed[field]
    const newValue = newParsed[field]

    if (originalValue !== undefined && originalValue !== newValue) {
      errors.push({
        block: language,
        field,
        message,
      })
    }
  }

  return errors
}

const detectOrphanedIds = (
  newBlocks: CodeBlock[],
  originalBlocksByLanguage: BlocksByLanguage
): ValidationError[] => {
  const errors: ValidationError[] = []
  const newBlocksByLanguage = groupBlocksByLanguage(newBlocks)

  for (const [language, originals] of Object.entries(originalBlocksByLanguage)) {
    if (isSingleton(language)) continue

    const news = newBlocksByLanguage[language] ?? []
    const originalIds = originals.map(getBlockId).filter((id): id is string => id !== null)
    const newIds = new Set(news.map(getBlockId).filter((id): id is string => id !== null))
    const isLegitimateDelete = news.length < originals.length

    for (const originalId of originalIds) {
      if (!newIds.has(originalId) && !isLegitimateDelete) {
        errors.push({
          block: language,
          field: "id",
          message: `Block with id "${originalId}" was removed. To update, keep the same id. To delete, remove the entire block.`,
        })
      }
    }
  }

  return errors
}

export type ValidateOptions = {
  context?: ValidationContext
  original?: string
  skipImmutableCheck?: boolean
}

export const validateMarkdownBlocks = (
  markdown: string,
  options: ValidateOptions = {}
): ValidationResult => {
  const blocks = parseCodeBlocks(markdown)
  const errors: ValidationError[] = []

  errors.push(...validateSingletons(markdown))

  const context = options.context ?? {
    documentProse: extractProse(markdown),
    availableCodes: [],
  }

  const originalBlocks = options.original ? parseCodeBlocks(options.original) : []
  const originalBlocksByLanguage = groupBlocksByLanguage(originalBlocks)

  for (const block of blocks) {
    const config = getBlockConfig(block.language)
    if (!config) continue

    const schemaErrors = validateBlockSchema(block.language, block.content)
    const semanticErrors = validateBlockSemantic(block.language, block.content, context)
    const blockErrors = [...schemaErrors, ...semanticErrors]

    if (options.original) {
      const findResult = findOriginalBlock(block, originalBlocksByLanguage)

      if (findResult.found) {
        if (!options.skipImmutableCheck) {
          const immutableErrors = validateImmutableFields(block.language, block, findResult.block)
          errors.push(...immutableErrors)
        }

        if (blockErrors.length > 0) {
          const currentBlock = formatBlock(block.language, findResult.block.content)
          for (const error of blockErrors) {
            error.currentBlock = currentBlock
          }
        }
      } else if (blockErrors.length > 0) {
        errors.push(findResult.error)
        continue
      }
    }

    errors.push(...blockErrors)
  }

  if (options.original && !options.skipImmutableCheck) {
    errors.push(...detectOrphanedIds(blocks, originalBlocksByLanguage))
  }

  return { valid: errors.length === 0, errors }
}

export const wouldViolateSingleton = (
  currentMarkdown: string,
  newMarkdown: string,
  language: string
): boolean => {
  if (!isSingleton(language)) return false

  const currentCount = countBlocksByLanguage(currentMarkdown, language)
  const newCount = countBlocksByLanguage(newMarkdown, language)

  return currentCount > 0 && newCount > currentCount
}

export { extractProse }
