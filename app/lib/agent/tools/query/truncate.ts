type Row = Record<string, unknown>

export interface TruncateResult {
  rows: Row[]
  truncated: boolean
}

const isString = (value: unknown): value is string => typeof value === "string"

const truncateValue = (value: unknown, maxLen: number): unknown =>
  isString(value) && value.length > maxLen ? value.slice(0, maxLen) + "..." : value

const truncateRow = (row: Row, maxLen: number): Row =>
  Object.fromEntries(Object.entries(row).map(([key, value]) => [key, truncateValue(value, maxLen)]))

export const truncateRows = (
  rows: Row[],
  maxRows: number,
  maxTextLength: number
): TruncateResult => {
  const capped = rows.length > maxRows
  const sliced = capped ? rows.slice(0, maxRows) : rows
  return {
    rows: sliced.map((row) => truncateRow(row, maxTextLength)),
    truncated: capped,
  }
}
