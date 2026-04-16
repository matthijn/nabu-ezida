type QuoteState = "outside" | "single" | "double" | "backtick"

const ESCAPE_MAP: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
}

const OPEN_QUOTE: Record<string, Exclude<QuoteState, "outside">> = {
  "'": "single",
  '"': "double",
  "`": "backtick",
}

const CLOSE_CHAR: Record<Exclude<QuoteState, "outside">, string> = {
  single: "'",
  double: '"',
  backtick: "`",
}

export const normalizeLlmSql = (sql: string): string => {
  let result = ""
  let state: QuoteState = "outside"
  let i = 0
  while (i < sql.length) {
    const c = sql[i]
    const n = sql[i + 1] ?? ""
    if (state === "outside") {
      const open = OPEN_QUOTE[c]
      if (open) {
        result += c
        state = open
        i += 1
        continue
      }
      if (c === "\\" && ESCAPE_MAP[n]) {
        result += ESCAPE_MAP[n]
        i += 2
        continue
      }
      result += c
      i += 1
      continue
    }
    const close = CLOSE_CHAR[state]
    if (c === close && n === close) {
      result += close + close
      i += 2
      continue
    }
    if (c === close) {
      result += c
      state = "outside"
      i += 1
      continue
    }
    result += c
    i += 1
  }
  return result
}
