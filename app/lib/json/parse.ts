export type JsonResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

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
