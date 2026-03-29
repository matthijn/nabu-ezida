import { calloutToProse } from "./callout/toProse"
import { annotationsToProse } from "./annotations/toProse"

export type ToProseFn = (block: unknown) => string | null

export const toProseFns: Record<string, ToProseFn> = {
  "json-callout": calloutToProse,
  "json-annotations": annotationsToProse,
}
