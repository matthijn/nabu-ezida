import { z } from "zod"
import type { ProjectionConfig } from "~/lib/db/projection"
import type { JsonSchema } from "~/lib/db/types"
import { CalloutSchema } from "~/domain/data-blocks/callout/schema"
import { DocumentMeta } from "~/domain/data-blocks/attributes/schema"
import { Settings } from "~/domain/data-blocks/settings/schema"
import { EmbeddingRowSchema } from "~/domain/embeddings/schema"
import { fastParseBlockContents } from "~/lib/embeddings/companion"

const isValidEmbeddingBlock = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" &&
  v !== null &&
  typeof (v as Record<string, unknown>).hash === "string" &&
  typeof (v as Record<string, unknown>).text === "string" &&
  Array.isArray((v as Record<string, unknown>).embedding)

const parseCompanionBlock = (content: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(content)
    return isValidEmbeddingBlock(parsed) ? parsed : null
  } catch {
    return null
  }
}

const parseCompanionBlocksForDb = (raw: string): Record<string, unknown>[] =>
  fastParseBlockContents(raw)
    .map(parseCompanionBlock)
    .filter((b): b is Record<string, unknown> => b !== null)

export const projections: ProjectionConfig[] = [
  {
    language: "json-callout",
    tableName: "callout",
    schema: CalloutSchema,
    singleton: false,
  },
  {
    language: "json-attributes",
    tableName: "attributes",
    schema: DocumentMeta,
    singleton: true,
  },
  {
    language: "json-settings",
    tableName: "settings",
    schema: Settings,
    singleton: true,
    allowedFiles: ["settings.hidden.md"],
  },
  {
    language: "json-embeddings",
    tableName: "files",
    schema: EmbeddingRowSchema,
    singleton: false,
    fileMapper: (f) => f.replace(/\.embeddings\.hidden\.md$/, ".md"),
    hiddenColumns: ["hash", "embedding"],
    blockParser: parseCompanionBlocksForDb,
  },
]

export const toJsonSchema = (config: ProjectionConfig): JsonSchema =>
  z.toJSONSchema(config.schema, { io: "input" }) as JsonSchema
