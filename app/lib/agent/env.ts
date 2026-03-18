import { getEnv } from "~/lib/utils/env"

export const getLlmHost = (): string => getEnv("VITE_LLM_HOST", "http://localhost:8081")

export const getLlmUrl = (path: string): string => `${getLlmHost()}${path}`
