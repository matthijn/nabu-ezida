import type { SearchHit } from "~/domain/search"

export const extractSearchSlice = (hit: SearchHit): string | null => hit.text ?? null
