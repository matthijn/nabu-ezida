import type { ComponentType } from "react"
import type { RadixColor } from "~/lib/colors/radix"
import type { EntityKind, EntityRef } from "~/domain/entity-link"
import { parseEntityLink } from "~/domain/entity-link"
import { serializeSpotlight } from "~/domain/spotlight"
import { lowContrastText, solidBackground, elementBackground, hoveredElementBackground } from "~/lib/colors/radix"
import {
  findAnnotationById,
  findCalloutById,
  findDocumentForAnnotation,
  findDocumentForCallout,
  resolveAnnotationColor,
} from "~/lib/files/selectors"

export type ResolvedColors = {
  text: string
  icon: string
  background: string
  backgroundHover: string
}

export type ResolvedLink = {
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

const BRAND_COLORS: ResolvedColors = {
  text: "var(--color-brand-700)",
  icon: "var(--color-brand-600)",
  background: "var(--color-brand-100)",
  backgroundHover: "var(--color-brand-200)",
}

const buildEntityUrl = (projectId: string, documentId: string, entityId: string): string =>
  `/project/${projectId}/file/${documentId}?entity=${entityId}`

const buildTextUrl = (projectId: string, documentId: string, spotlight: { type: string } | null): string => {
  const base = `/project/${projectId}/file/${documentId}`
  if (!spotlight) return base
  return `${base}?spotlight=${encodeURIComponent(serializeSpotlight(spotlight as Parameters<typeof serializeSpotlight>[0]))}`
}

const resolveAnnotationRef = (
  ref: Extract<EntityRef, { kind: "annotation" }>,
  files: Record<string, string>,
  projectId: string,
  annotationIcon: ComponentType<{ className?: string }>,
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
  projectId: string,
  calloutIcon: ComponentType<{ className?: string }>,
): ResolvedLink | null => {
  const callout = findCalloutById(files, ref.id)
  if (!callout) return null
  const documentId = findDocumentForCallout(files, ref.id)
  if (!documentId) return null
  return {
    kind: "callout",
    colors: radixColors(callout.color),
    icon: calloutIcon,
    url: buildEntityUrl(projectId, documentId, ref.id),
    label: callout.title,
  }
}

const resolveTextRef = (
  ref: Extract<EntityRef, { kind: "text" }>,
  projectId: string,
  textIcon: ComponentType<{ className?: string }>,
): ResolvedLink => ({
  kind: "text",
  colors: BRAND_COLORS,
  icon: textIcon,
  url: buildTextUrl(projectId, ref.documentId, ref.spotlight),
  label: ref.documentId,
})

export type EntityIcons = {
  annotation: ComponentType<{ className?: string }>
  callout: ComponentType<{ className?: string }>
  text: ComponentType<{ className?: string }>
}

export const resolveEntityLink = (
  href: string,
  files: Record<string, string>,
  projectId: string,
  icons: EntityIcons,
): ResolvedLink | null => {
  const ref = parseEntityLink(href)
  if (!ref) return null

  switch (ref.kind) {
    case "annotation":
      return resolveAnnotationRef(ref, files, projectId, icons.annotation)
    case "callout":
      return resolveCalloutRef(ref, files, projectId, icons.callout)
    case "text":
      return resolveTextRef(ref, projectId, icons.text)
    default: {
      const _exhaustive: never = ref
      throw new Error(`Unknown entity kind: ${(_exhaustive as EntityRef).kind}`)
    }
  }
}
