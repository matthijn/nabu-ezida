const UUID_PLACEHOLDER_REGEX = /\[uuid-([a-zA-Z0-9_-]+)\]/g

const generateShortId = (): string =>
  Math.random().toString(36).substring(2, 10)

export type UuidMapping = Record<string, string>

export const replaceUuidPlaceholders = (content: string): { result: string; generated: UuidMapping } => {
  const generated: UuidMapping = {}

  const result = content.replace(UUID_PLACEHOLDER_REGEX, (match, name) => {
    if (!(name in generated)) {
      generated[name] = generateShortId()
    }
    return generated[name]
  })

  return { result, generated }
}

export const hasUuidPlaceholders = (content: string): boolean =>
  UUID_PLACEHOLDER_REGEX.test(content)
