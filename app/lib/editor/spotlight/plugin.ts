import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { Node } from "prosemirror-model"
import type { Spotlight } from "~/domain/spotlight"
import { proseTextContent, textOffsetToPos } from "~/lib/editor/text"
import type { TextRange } from "~/lib/editor/text"
import { findMatchOffset } from "~/lib/diff/fuzzy-inline"

const pluginKey = new PluginKey("spotlight")

export const spotlightMeta = pluginKey

const SPOTLIGHT_STYLE = "border-bottom: 2px solid var(--color-brand-600) !important;"

const resolveSpotlightSingle = (doc: Node, text: string): TextRange | null => {
  const proseText = proseTextContent(doc)
  const offset = findMatchOffset(proseText, text)
  if (!offset) return null
  return {
    from: textOffsetToPos(doc, offset.start),
    to: textOffsetToPos(doc, offset.end),
  }
}

const resolveSpotlightRange = (doc: Node, from: string, to: string): TextRange | null => {
  const proseText = proseTextContent(doc)
  const fromOffset = findMatchOffset(proseText, from)
  if (!fromOffset) return null
  const remainingText = proseText.slice(fromOffset.start)
  const toOffset = findMatchOffset(remainingText, to)
  if (!toOffset) return null
  return {
    from: textOffsetToPos(doc, fromOffset.start),
    to: textOffsetToPos(doc, fromOffset.start + toOffset.end),
  }
}

const resolveSpotlight = (doc: Node, spotlight: Spotlight): TextRange | null => {
  switch (spotlight.type) {
    case "single":
      return resolveSpotlightSingle(doc, spotlight.text)
    case "range":
      return resolveSpotlightRange(doc, spotlight.from, spotlight.to)
  }
}

const toDecorationSet = (doc: Node, range: TextRange): DecorationSet =>
  DecorationSet.create(doc, [
    Decoration.inline(range.from, range.to, {
      style: SPOTLIGHT_STYLE,
      "data-spotlight": "true",
    }),
  ])

const computeDecorations = (doc: Node, spotlight: Spotlight | null): DecorationSet => {
  if (!spotlight) return DecorationSet.empty
  const range = resolveSpotlight(doc, spotlight)
  if (!range) return DecorationSet.empty
  return toDecorationSet(doc, range)
}

type PluginState = {
  spotlight: Spotlight | null
  decorations: DecorationSet
}

export const createSpotlightPlugin = (): Plugin =>
  new Plugin({
    key: pluginKey,
    state: {
      init: (): PluginState => ({ spotlight: null, decorations: DecorationSet.empty }),
      apply: (tr, pluginState, _oldState, newState) => {
        const newSpotlight = tr.getMeta(pluginKey) as Spotlight | null | undefined
        if (newSpotlight !== undefined) {
          return {
            spotlight: newSpotlight,
            decorations: computeDecorations(newState.doc, newSpotlight),
          }
        }
        if (!tr.docChanged) return pluginState
        return {
          spotlight: pluginState.spotlight,
          decorations: computeDecorations(newState.doc, pluginState.spotlight),
        }
      },
    },
    props: {
      decorations: (state) => {
        const ps = pluginKey.getState(state) as PluginState | undefined
        return ps?.decorations ?? DecorationSet.empty
      },
    },
  })
