import { z } from "zod"
import type { ProjectionConfig } from "~/lib/db/projection"
import type { JsonSchema } from "~/lib/db/types"
import { CalloutSchema } from "~/domain/data-blocks/callout/schema"
import { DocumentMeta } from "~/domain/data-blocks/attributes/schema"
import { Settings } from "~/domain/data-blocks/settings/schema"

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
]

const removeFromRequired = (schema: JsonSchema, fields: string[]): JsonSchema => {
  if (!schema.required) return schema
  const filtered = schema.required.filter((f) => !fields.includes(f))
  return { ...schema, required: filtered.length > 0 ? filtered : undefined }
}

const patchAnnotationItems = (schema: JsonSchema): JsonSchema => {
  const annotations = schema.properties?.annotations
  if (!annotations?.items) return schema
  const patchedItems = removeFromRequired(annotations.items, ["color", "code"])
  return {
    ...schema,
    properties: {
      ...schema.properties,
      annotations: { ...annotations, items: patchedItems },
    },
  }
}

const patchByTable: Record<string, (s: JsonSchema) => JsonSchema> = {
  attributes: patchAnnotationItems,
}

export const toJsonSchema = (config: ProjectionConfig): JsonSchema => {
  const schema = z.toJSONSchema(config.schema, { io: "input" }) as JsonSchema
  const patch = patchByTable[config.tableName]
  return patch ? patch(schema) : schema
}
