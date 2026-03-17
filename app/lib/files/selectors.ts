import { findAnnotationById } from "~/domain/blocks/attributes/annotations/selectors"
import { findCalloutById } from "~/domain/blocks/callout/selectors"
import { findTagDefinitionById } from "~/domain/blocks/settings/tags/selectors"
import { toDisplayName } from "./filename"

export const resolveEntityName = (files: Record<string, string>, id: string): string | null =>
  id.startsWith("annotation-")
    ? (findAnnotationById(files, id)?.text ?? null)
    : id.startsWith("callout-")
      ? (findCalloutById(files, id)?.title ?? null)
      : id.startsWith("tag-")
        ? (findTagDefinitionById(files, id)?.display ?? null)
        : id.endsWith(".md") && id.toLowerCase() in files
          ? toDisplayName(id.toLowerCase())
          : null
