import { z } from "zod"
import { DocumentMeta } from "~/domain/sidecar/schema"

type BlockTypeConfig = {
  schema: z.ZodType
  readonly: string[]
  renderer: "hidden" | "code-card"
  singleton: boolean
}

export const blockTypes: Record<string, BlockTypeConfig> = {
  "json-attributes": {
    schema: DocumentMeta,
    readonly: ["annotations"],
    renderer: "hidden",
    singleton: true,
  },
}

export const getBlockConfig = (language: string): BlockTypeConfig | undefined =>
  blockTypes[language]

export const isKnownBlockType = (language: string): boolean =>
  language in blockTypes

export const isSingleton = (language: string): boolean =>
  blockTypes[language]?.singleton ?? false
