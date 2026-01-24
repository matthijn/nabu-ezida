import { Plugin, PluginKey } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import type { Node } from "prosemirror-model"
import { getBlockConfig } from "~/domain/blocks"

const pluginKey = new PluginKey("hiddenBlocks")

const isHiddenBlock = (language: string): boolean => {
  const config = getBlockConfig(language)
  return config?.renderer === "hidden"
}

const findHiddenBlocks = (doc: Node): Decoration[] => {
  const decorations: Decoration[] = []

  doc.descendants((node, pos) => {
    if (node.type.name === "code_block") {
      const language = node.attrs.language as string | undefined
      if (language && isHiddenBlock(language)) {
        decorations.push(
          Decoration.node(pos, pos + node.nodeSize, {
            class: "hidden-block",
            style: "display: none;",
          })
        )
      }
    }
    return true
  })

  return decorations
}

const computeDecorations = (doc: Node): DecorationSet =>
  DecorationSet.create(doc, findHiddenBlocks(doc))

export const createHiddenBlocksPlugin = (): Plugin =>
  new Plugin({
    key: pluginKey,
    state: {
      init: (_, state) => computeDecorations(state.doc),
      apply: (tr, decorations, _oldState, newState) => {
        if (!tr.docChanged) return decorations
        return computeDecorations(newState.doc)
      },
    },
    props: {
      decorations: (state) => pluginKey.getState(state) as DecorationSet,
    },
  })
