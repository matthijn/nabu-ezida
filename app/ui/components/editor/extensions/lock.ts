import { Extension } from "@tiptap/react"

declare module "@tiptap/react" {
  interface NodeConfig {
    lockable?: boolean
  }
}

export interface LockOptions {
  types: string[]
}

export const Lock = Extension.create<LockOptions>({
  name: "lock",

  addOptions() {
    return {
      types: ["paragraph", "heading", "bulletList", "orderedList", "blockquote", "codeBlock"],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lockedBy: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-locked-by"),
            renderHTML: (attributes) => {
              if (!attributes.lockedBy) return {}
              return { "data-locked-by": attributes.lockedBy }
            },
          },
        },
      },
    ]
  },
})
