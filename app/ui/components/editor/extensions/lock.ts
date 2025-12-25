import { Extension } from "@tiptap/react"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import type { Node } from "@tiptap/pm/model"
import type { Transaction } from "@tiptap/pm/state"

export const NON_LOCKABLE = new Set([
  "doc",
  "text",
  "tableRow",
  "tableCell",
  "tableHeader",
  "listItem",
  "taskItem",
  "hardBreak",
  "horizontalRule",
])

export const isLockable = (name: string): boolean =>
  !NON_LOCKABLE.has(name)

const isNodeLocked = (node: Node): boolean =>
  !!node.attrs.lockedBy

const transactionTouchesLockedNode = (tr: Transaction, doc: Node): boolean => {
  let touchesLocked = false

  tr.steps.forEach((step) => {
    const stepMap = step.getMap()
    stepMap.forEach((oldStart, oldEnd) => {
      doc.nodesBetween(oldStart, oldEnd, (node) => {
        if (isNodeLocked(node)) {
          touchesLocked = true
          return false
        }
        return true
      })
    })
  })

  return touchesLocked
}

export const Lock = Extension.create({
  name: "lock",

  addGlobalAttributes() {
    const nodeExtensions = this.extensions.filter((ext) => ext.type === "node")
    const lockableTypes = nodeExtensions
      .map((ext) => ext.name)
      .filter(isLockable)

    return [
      {
        types: lockableTypes,
        attributes: {
          lockedBy: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-locked-by"),
            renderHTML: (attributes) => {
              if (!attributes.lockedBy) return {}
              return { "data-locked-by": attributes.lockedBy }
            },
          },
          lockReason: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-lock-reason"),
            renderHTML: (attributes) => {
              if (!attributes.lockReason) return {}
              return { "data-lock-reason": attributes.lockReason }
            },
          },
          loading: {
            default: false,
            parseHTML: (element) => element.getAttribute("data-loading") === "true",
            renderHTML: (attributes) => {
              if (!attributes.loading) return {}
              return { "data-loading": "true" }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("lock"),
        filterTransaction: (tr, state) => {
          if (!tr.docChanged) return true
          return !transactionTouchesLockedNode(tr, state.doc)
        },
      }),
    ]
  },
})
