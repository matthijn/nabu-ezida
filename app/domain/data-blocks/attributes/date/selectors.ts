import { getAttributes } from "../selectors"

export const getFileDate = (raw: string): string | undefined =>
  getAttributes(raw)?.date ?? undefined
