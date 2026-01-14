import { Decoration, DecorationSet } from "@tiptap/pm/view"
import type { Node } from "@tiptap/pm/model"
import type { OverlapSegment } from "~/domain/document/annotations"
import { createBackground } from "~/domain/document/annotations"
import { elementBackground } from "~/lib/colors/radix"

const toBackgroundColors = (colors: string[]): string[] =>
  colors.map((color) => elementBackground(color))

const createDecorationAttrs = (segment: OverlapSegment) => {
  const bgColors = toBackgroundColors(segment.colors)
  return {
    style: `background: ${createBackground(bgColors)};`,
    "data-annotation-ids": segment.ids.join(","),
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
