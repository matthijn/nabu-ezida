import type { ComponentType } from "react"
import type { RadixColor } from "~/lib/colors/radix"
import type { EntityKind, EntityRef } from "~/domain/entity-link"
import { parseEntityLink } from "~/domain/entity-link"
import { serializeSpotlight } from "~/domain/spotlight"
import { calloutTypeIcons } from "~/domain/blocks/callout/schema"
import { annotationIcon } from "~/domain/blocks/attributes/schema"
import {
  lowContrastText,
  solidBackground,
  elementBackground,
  hoveredElementBackground,
} from "~/lib/colors/radix"
import { resolveFeatherIcon } from "~/lib/icons/feather-map"
import {
  findAnnotationById,
  findDocumentForAnnotation,
  resolveAnnotationColor,
} from "~/domain/blocks/attributes/annotations/selectors"
import { findCalloutById, findDocumentForCallout } from "~/domain/blocks/callout/selectors"
import { findTagDefinitionById } from "~/domain/blocks/settings/tags/selectors"

export interface ResolvedColors {
  text: string
  icon: string
  background: string
  backgroundHover: string
}

export interface ResolvedLink {
  kind: EntityKind
  colors: ResolvedColors
  icon: ComponentType<{ className?: string }>
  url: string
  label: string
}

const radixColors = (color: RadixColor): ResolvedColors => ({
  text: lowContrastText(color),
  icon: solidBackground(color),
  background: elementBackground(color),
  backgroundHover: hoveredElementBackground(color),
})

const FILE_COLORS: ResolvedColors = {
  text: "var(--color-brand-700)",
  icon: "var(--color-brand-600)",
  background: "var(--color-brand-100)",
  backgroundHover: "var(--color-brand-200)",
}

const SPOTLIGHT_COLORS: ResolvedColors = {
  text: "var(--color-neutral-700)",
  icon: "var(--color-neutral-500)",
  background: "var(--color-neutral-200)",
  backgroundHover: "var(--color-neutral-300)",
}

const buildEntityUrl = (projectId: string, documentId: string, entityId: string): string =>
  `/project/${projectId}/file/${documentId}?entity=${entityId}`

const buildTextUrl = (
  projectId: string,
  documentId: string,
  spotlight: { type: string } | null
): string => {
  const base = `/project/${projectId}/file/${documentId}`
  if (!spotlight) return base
  return `${base}?spotlight=${encodeURIComponent(serializeSpotlight(spotlight as Parameters<typeof serializeSpotlight>[0]))}`
}

const resolveAnnotationRef = (
  ref: Extract<EntityRef, { kind: "annotation" }>,
  files: Record<string, string>,
  projectId: string
): ResolvedLink | null => {
  const annotation = findAnnotationById(files, ref.id)
  if (!annotation) return null
  const documentId = findDocumentForAnnotation(files, ref.id)
  if (!documentId) return null
  return {
    kind: "annotation",
    colors: radixColors(resolveAnnotationColor(files, annotation)),
    icon: annotationIcon,
    url: buildEntityUrl(projectId, documentId, ref.id),
    label: annotation.text,
  }
}

const resolveCalloutRef = (
  ref: Extract<EntityRef, { kind: "callout" }>,
  files: Record<string, string>,
  projectId: string
): ResolvedLink | null => {
  const callout = findCalloutById(files, ref.id)
  if (!callout) return null
  const documentId = findDocumentForCallout(files, ref.id)
  if (!documentId) return null
  return {
    kind: "callout",
    colors: radixColors(callout.color),
    icon: calloutTypeIcons[callout.type],
    url: buildEntityUrl(projectId, documentId, ref.id),
    label: callout.title,
  }
}

const resolveTagRef = (
  ref: Extract<EntityRef, { kind: "tag" }>,
  files: Record<string, string>
): ResolvedLink | null => {
  const tag = findTagDefinitionById(files, ref.id)
  if (!tag) return null
  return {
    kind: "tag",
    colors: radixColors(tag.color),
    icon: resolveFeatherIcon(tag.icon),
    url: "",
    label: tag.display,
  }
}

const hasSpotlight = (ref: Extract<EntityRef, { kind: "text" }>): boolean => ref.spotlight !== null

const resolveTextRef = (
  ref: Extract<EntityRef, { kind: "text" }>,
  projectId: string,
  icons: EntityIcons
): ResolvedLink => ({
  kind: "text",
  colors: hasSpotlight(ref) ? SPOTLIGHT_COLORS : FILE_COLORS,
  icon: hasSpotlight(ref) ? icons.spotlight : icons.file,
  url: buildTextUrl(projectId, ref.documentId, ref.spotlight),
  label: ref.documentId,
})

export interface EntityIcons {
  file: ComponentType<{ className?: string }>
  spotlight: ComponentType<{ className?: string }>
}

export const resolveEntityLink = (
  href: string,
  files: Record<string, string>,
  projectId: string,
  icons: EntityIcons
): ResolvedLink | null => {
  const ref = parseEntityLink(href)
  if (!ref) return null

  switch (ref.kind) {
    case "annotation":
      return resolveAnnotationRef(ref, files, projectId)
    case "callout":
      return resolveCalloutRef(ref, files, projectId)
    case "tag":
      return resolveTagRef(ref, files)
    case "text":
      return resolveTextRef(ref, projectId, icons)
    default: {
      const _exhaustive: never = ref
      throw new Error(`Unknown entity kind: ${(_exhaustive as EntityRef).kind}`)
    }
  }
}
