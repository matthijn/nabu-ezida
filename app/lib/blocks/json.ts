export type ParsedPath =
  | { type: "root"; field: string }
  | { type: "array"; arrayField: string; itemField: string }

export const parsePath = (path: string): ParsedPath | null => {
  if (!path.includes(".")) {
    return { type: "root", field: path }
  }

  const match = path.match(/^([^.]+)\.\*\.([^.]+)$/)
  if (match) {
    return { type: "array", arrayField: match[1], itemField: match[2] }
  }

  return null
}

export const tryParseJson = (content: string): Record<string, unknown> | null => {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

export const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
