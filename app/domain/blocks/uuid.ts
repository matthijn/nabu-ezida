const UUID_PLACEHOLDER_REGEX = /\[uuid-([a-zA-Z0-9_-]+)\]/g
const TRAILING_NUMBER_REGEX = /-\d+$/

const generateShortId = (): string =>
  Math.random().toString(36).substring(2, 10)

const extractPrefix = (name: string): string =>
  name.replace(TRAILING_NUMBER_REGEX, "")

const generatePrefixedId = (name: string): string =>
  `${extractPrefix(name)}_${generateShortId()}`

export type UuidMapping = Record<string, string>

export const replaceUuidPlaceholders = (content: string): { result: string; generated: UuidMapping } => {
  const generated: UuidMapping = {}

  const result = content.replace(UUID_PLACEHOLDER_REGEX, (_, name) => {
    if (!(name in generated)) {
      generated[name] = generatePrefixedId(name)
    }
    return generated[name]
  })

  return { result, generated }
}

export const hasUuidPlaceholders = (content: string): boolean =>
  UUID_PLACEHOLDER_REGEX.test(content)
