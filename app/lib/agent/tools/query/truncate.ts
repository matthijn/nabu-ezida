type Row = Record<string, unknown>

export interface CapResult {
  rows: Row[]
  capped: boolean
}

export const capRows = (rows: Row[], maxRows: number): CapResult => {
  const capped = rows.length > maxRows
  return {
    rows: capped ? rows.slice(0, maxRows) : rows,
    capped,
  }
}
