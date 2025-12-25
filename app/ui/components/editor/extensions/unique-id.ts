import UniqueID from "@tiptap/extension-unique-id"
import { isLockable } from "./lock"

export const BlockID = UniqueID.extend({
  addGlobalAttributes() {
    const nodeExtensions = this.extensions.filter((ext) => ext.type === "node")
    const types = nodeExtensions.map((ext) => ext.name).filter(isLockable)

    return [
      {
        types,
        attributes: {
          id: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-id"),
            renderHTML: (attributes) => {
              if (!attributes.id) return {}
              return { "data-id": attributes.id }
            },
          },
        },
      },
    ]
  },
})
