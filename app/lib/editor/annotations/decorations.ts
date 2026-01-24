import { Decoration, DecorationSet } from "prosemirror-view"
import type { Node } from "prosemirror-model"
import type { OverlapSegment } from "~/domain/document/annotations"
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

export const createDecorationSet = (
  doc: Node,
  segments: OverlapSegment[]
): DecorationSet => {
  const decorations = segments.map((segment) =>
    Decoration.inline(segment.from, segment.to, createDecorationAttrs(segment))
  )
  return DecorationSet.create(doc, decorations)
}
