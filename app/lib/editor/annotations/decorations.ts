import { Decoration, DecorationSet } from "prosemirror-view"
import type { Node } from "prosemirror-model"
import type { OverlapSegment, ResolvedAnnotation } from "~/domain/document/annotations"
import { createBackground } from "~/domain/document/annotations"

const toRadixVar = (color: string): string => `var(--${color}-3)`

const toBackgroundColors = (colors: string[]): string[] =>
  colors.map(toRadixVar)

const createDecorationAttrs = (segment: OverlapSegment) => {
  const bgColors = toBackgroundColors(segment.colors)
  return {
    style: `background: ${createBackground(bgColors)}; border-radius: 2px;`,
    "data-annotation-colors": segment.colors.join(","),
  }
}

const hasId = (a: ResolvedAnnotation): a is ResolvedAnnotation & { id: string } =>
  a.id !== undefined

const toMarkerDecoration = (a: ResolvedAnnotation & { id: string }): Decoration =>
  Decoration.inline(a.from, a.to, { "data-id": a.id })

export const createMarkerDecorations = (resolved: ResolvedAnnotation[]): Decoration[] =>
  resolved.filter(hasId).map(toMarkerDecoration)

export const createDecorationSet = (
  doc: Node,
  segments: OverlapSegment[],
  markerDecorations: Decoration[] = [],
): DecorationSet => {
  const overlapDecorations = segments.map((segment) =>
    Decoration.inline(segment.from, segment.to, createDecorationAttrs(segment))
  )
  return DecorationSet.create(doc, [...overlapDecorations, ...markerDecorations])
}
