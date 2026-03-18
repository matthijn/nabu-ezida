export const isAbortError = (e: unknown): boolean => e instanceof Error && e.name === "AbortError"
