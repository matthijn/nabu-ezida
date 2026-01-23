export type JsonResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export const parseJson = <T = unknown>(content: string): JsonResult<T> => {
  try {
    return { ok: true, data: JSON.parse(content) as T }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Invalid JSON" }
  }
}
