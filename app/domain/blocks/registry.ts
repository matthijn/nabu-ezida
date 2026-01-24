import { z } from "zod"
import { DocumentMeta } from "~/domain/sidecar/schema"
import { CalloutSchema } from "./callout"

type BlockTypeConfig = {
  schema: z.ZodType
  readonly: string[]
  immutable: string[]
  renderer: "hidden" | "callout"
  singleton: boolean
}

export const blockTypes: Record<string, BlockTypeConfig> = {
  "json-attributes": {
    schema: DocumentMeta,
    readonly: ["annotations"],
    immutable: [],
    renderer: "hidden",
    singleton: true,
  },
  "json-callout": {
    schema: CalloutSchema,
    readonly: [],
    immutable: ["id"],
    renderer: "callout",
    singleton: false,
  },
}

export const getBlockConfig = (language: string): BlockTypeConfig | undefined =>
  blockTypes[language]

export const isKnownBlockType = (language: string): boolean =>
  language in blockTypes

export const isSingleton = (language: string): boolean =>
  blockTypes[language]?.singleton ?? false
