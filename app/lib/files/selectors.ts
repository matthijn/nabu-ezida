import type { FileStore } from "./store"
import { findAnnotationById } from "~/domain/data-blocks/attributes/annotations/selectors"
import { findCalloutById } from "~/domain/data-blocks/callout/selectors"
import { findTagDefinitionById } from "~/domain/data-blocks/settings/tags/selectors"
import { findSearchById } from "~/domain/data-blocks/settings/searches/selectors"
import { toDisplayName } from "./filename"

export const resolveEntityName = (files: FileStore, id: string): string | null =>
  id.startsWith("annotation-")
    ? (findAnnotationById(files, id)?.text ?? null)
    : id.startsWith("callout-")
      ? (findCalloutById(files, id)?.title ?? null)
      : id.startsWith("search-")
        ? (findSearchById(files, id)?.description ?? null)
        : id.startsWith("tag-")
          ? (findTagDefinitionById(files, id)?.display ?? null)
          : id.endsWith(".md") && id.toLowerCase() in files
            ? toDisplayName(id.toLowerCase())
            : null
