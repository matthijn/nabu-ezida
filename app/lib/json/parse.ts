export type JsonResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const repairJsonNewlines = (json: string): string => {
  let result = ""
  let inString = false
  let i = 0

  while (i < json.length) {
    const char = json[i]

    if (char === '"' && (i === 0 || json[i - 1] !== "\\")) {
      inString = !inString
      result += char
    } else if (inString && char === "\n") {
      result += "\\n"
    } else if (inString && char === "\r") {
      result += "\\r"
    } else {
      result += char
    }
    i++
  }

  return result
}

export const parseJson = <T = unknown>(content: string): JsonResult<T> => {
  const trimmed = content.trim()
  if (!trimmed) {
    return { ok: false, error: "Empty content" }
  }
  try {
    return { ok: true, data: JSON.parse(trimmed) as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}
