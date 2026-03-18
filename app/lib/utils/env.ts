export const getEnv = (key: string, fallback: string): string =>
  (import.meta.env[key] as string | undefined) ?? fallback
