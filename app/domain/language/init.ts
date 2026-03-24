import { subscribe, getFiles, updateFileRaw } from "~/lib/files/store"
import { startLanguageSync } from "~/lib/language/sync"
import { calloutToProse } from "~/domain/data-blocks/callout/toProse"
import { attributesToProse } from "~/domain/data-blocks/attributes/toProse"

const toProseFns: Record<string, (block: unknown) => string | null> = {
  "json-callout": calloutToProse,
  "json-attributes": attributesToProse,
}

export const startLanguageDetection = (): (() => void) =>
  startLanguageSync({
    getFiles,
    updateFile: updateFileRaw,
    subscribe,
    toProseFns,
  })
