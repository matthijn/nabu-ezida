import { z } from "zod"
import { getBlockConfig, isSingleton } from "./registry"
import { parseCodeBlocks, countBlocksByLanguage, type CodeBlock } from "./parse"

export type ValidationError = {
  block: string
  field?: string
  message: string
}

export type ValidationResult = {
  valid: boolean
  errors: ValidationError[]
}

const validateBlockJson = (language: string, content: string): ValidationError[] => {
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

export const validateMarkdownBlocks = (markdown: string): ValidationResult => {
  const blocks = parseCodeBlocks(markdown)
  const errors: ValidationError[] = []

  errors.push(...validateSingletons(markdown))

  for (const block of blocks) {
    if (getBlockConfig(block.language)) {
      errors.push(...validateBlockJson(block.language, block.content))
    }
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
