export type LineZone = "outside" | "prose" | "structure"
export type ZoneMap = LineZone[]
export type JsonBlockSpan = { startLine: number; endLine: number; lineCount: number }

type ZoneState = "outside" | "json-block" | "prose" | "non-json-block"

const isJsonFenceOpen = (line: string): boolean =>
  /^```json-/.test(line)

const isNonJsonFenceOpen = (line: string): boolean =>
  /^```[a-zA-Z]/.test(line) && !isJsonFenceOpen(line)

const isFenceClose = (line: string): boolean =>
  line.trimStart() === "```" || /^```\s*$/.test(line)

const isProseOpen = (line: string): boolean =>
  line.endsWith('"""') && !isProseClose(line)

const isProseClose = (line: string): boolean =>
  /^\s*"""[,}]?\s*$/.test(line) && !/:\s*"""$/.test(line)

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
        } else if (isProseOpen(line)) {
          state = "prose"
          zones.push("structure")
        } else {
          zones.push("structure")
        }
        break

      case "prose":
        if (isProseClose(line)) {
          state = "json-block"
          zones.push("structure")
        } else {
          zones.push("prose")
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

      default: {
        const exhaustive: never = state
        throw new Error(`unknown state: ${exhaustive}`)
      }
    }
  }

  return zones
}

export const findJsonBlockSpans = (zones: ZoneMap): JsonBlockSpan[] => {
  const spans: JsonBlockSpan[] = []
  let blockStart: number | null = null

  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i]
    const inBlock = zone === "structure" || zone === "prose"

    if (inBlock && blockStart === null) {
      blockStart = i
    } else if (!inBlock && blockStart !== null) {
      spans.push({ startLine: blockStart, endLine: i - 1, lineCount: i - blockStart })
      blockStart = null
    }
  }

  if (blockStart !== null) {
    spans.push({ startLine: blockStart, endLine: zones.length - 1, lineCount: zones.length - blockStart })
  }

  return spans
}
