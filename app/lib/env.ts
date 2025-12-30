const getEnv = (key: string, fallback: string): string =>
  (import.meta.env[key] as string | undefined) ?? fallback

export const getApiHost = (): string => getEnv("VITE_API_HOST", "localhost:8080")

export const isDebug = (): boolean => getEnv("VITE_DEBUG", "false") === "true"

export const getApiUrl = (path: string): string => {
  const protocol = window.location.protocol === "https:" ? "https" : "http"
  return `${protocol}://${getApiHost()}${path}`
}

export const getWsUrl = (path: string): string => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${getApiHost()}${path}`
}

export const getLlmHost = (): string => getEnv("VITE_LLM_HOST", "http://localhost:8081")

export const getLlmUrl = (path: string): string => `${getLlmHost()}${path}`
