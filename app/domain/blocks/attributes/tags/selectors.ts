import { getAttributes } from "../selectors"

export const getTags = (raw: string): string[] => getAttributes(raw)?.tags ?? []
