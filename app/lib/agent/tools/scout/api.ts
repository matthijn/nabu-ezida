import type { ScoutMap } from "../scout-map"
import { scoutProse } from "../scout-map"
import {
  buildProseWithLineMap,
  formatScoutMap,
  translateSections,
  type CodeblockMarker,
} from "./prose"

export type ScoutEntry =
  | { kind: "inline"; path: string; content: string }
  | { kind: "mapped"; path: string; map: ScoutMap; codeblocks: CodeblockMarker[] }

const PROSE_LINE_THRESHOLD = 50

const countLines = (text: string): number => text.split("\n").length

export interface ScoutOptions {
  forceScout?: boolean
}

export const scoutFile = async (
  path: string,
  content: string,
  reason: string,
  options?: ScoutOptions
): Promise<ScoutEntry> => {
  const { prose, proseToOrig, codeblocks } = buildProseWithLineMap(content)

  if (!options?.forceScout && countLines(prose) <= PROSE_LINE_THRESHOLD) {
    return { kind: "inline", path, content }
  }

  const raw = await scoutProse(prose, reason)
  const translated = translateSections(raw.sections, proseToOrig, countLines(content))
  return {
    kind: "mapped",
    path,
    map: { file_context: raw.file_context, sections: translated },
    codeblocks,
  }
}

export const formatScoutEntry = (entry: ScoutEntry): string => {
  switch (entry.kind) {
    case "inline":
      return `File: ${entry.path}\n${entry.content}`
    case "mapped":
      return formatScoutMap(entry.path, entry.map, entry.codeblocks)
    default:
      throw new Error(`unknown scout entry kind: ${(entry as ScoutEntry).kind}`)
  }
}
