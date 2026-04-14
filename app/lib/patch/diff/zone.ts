import { exhaustive } from "~/lib/utils/exhaustive"

export type LineZone = "outside" | "structure"
export type ZoneMap = LineZone[]
export interface JsonBlockSpan {
  startLine: number
  endLine: number
  lineCount: number
}

type ZoneState = "outside" | "json-block" | "non-json-block"

const isJsonFenceOpen = (line: string): boolean => /^```json-/.test(line)

const isNonJsonFenceOpen = (line: string): boolean =>
  /^```[a-zA-Z]/.test(line) && !isJsonFenceOpen(line)

const isFenceClose = (line: string): boolean => line.trimStart() === "```" || /^```\s*$/.test(line)

export const buildLineZones = (content: string): ZoneMap => {
  const lines = content.split("\n")
  const zones: ZoneMap = []
  let state: ZoneState = "outside"

  for (const line of lines) {
    switch (state) {
      case "outside":
        if (isJsonFenceOpen(line)) {
          state = "json-block"
          zones.push("structure")
        } else if (isNonJsonFenceOpen(line)) {
          state = "non-json-block"
          zones.push("outside")
        } else {
          zones.push("outside")
        }
        break

      case "json-block":
        if (isFenceClose(line)) {
          state = "outside"
          zones.push("outside")
        } else {
          zones.push("structure")
        }
        break

      case "non-json-block":
        if (isFenceClose(line)) {
          state = "outside"
          zones.push("outside")
        } else {
          zones.push("outside")
        }
        break

      default:
        return exhaustive(state)
    }
  }

  return zones
}

export const findJsonBlockSpans = (zones: ZoneMap): JsonBlockSpan[] => {
  const spans: JsonBlockSpan[] = []
  let blockStart: number | null = null

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i]
    const inBlock = zone === "structure"

    if (inBlock && blockStart === null) {
      blockStart = i
    } else if (!inBlock && blockStart !== null) {
      spans.push({ startLine: blockStart, endLine: i - 1, lineCount: i - blockStart })
      blockStart = null
    }
  }

  if (blockStart !== null) {
    spans.push({
      startLine: blockStart,
      endLine: zones.length - 1,
      lineCount: zones.length - blockStart,
    })
  }

  return spans
}
