const normalize = (text: string): string => text.toLowerCase().trim()

export const matchesFilter = (query: string, text: string): boolean => {
  const normalizedQuery = normalize(query)
  if (normalizedQuery === "") return true
  return normalize(text).includes(normalizedQuery)
}

export const matchesAny = (query: string, texts: string[]): boolean =>
  texts.some((text) => matchesFilter(query, text))
