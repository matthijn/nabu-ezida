import { getEnv } from "~/lib/utils/env"

const getApiHost = (): string => getEnv("VITE_API_HOST", "localhost:8080")

export const getApiUrl = (path: string): string => {
  const protocol = window.location.protocol === "https:" ? "https" : "http"
  return `${protocol}://${getApiHost()}${path}`
}

export const getWsUrl = (path: string): string => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws"
  return `${protocol}://${getApiHost()}${path}`
}
