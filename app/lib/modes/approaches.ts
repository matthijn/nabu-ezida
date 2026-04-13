import { getLlmUrl, getLlmHeaders } from "~/lib/agent/env"

interface ApproachMeta {
  keys: string[]
  descriptions: Record<string, string>
}

let cached: ApproachMeta | null = null

const toMeta = (dict: Record<string, string>): ApproachMeta => ({
  keys: Object.keys(dict).sort(),
  descriptions: dict,
})

export const fetchApproachMeta = async (): Promise<ApproachMeta> => {
  if (cached) return cached
  const resp = await fetch(getLlmUrl("/approaches"), { headers: getLlmHeaders() })
  cached = toMeta((await resp.json()) as Record<string, string>)
  return cached
}

export const getApproachMeta = (): ApproachMeta => {
  if (!cached) throw new Error("approach meta not initialized")
  return cached
}
