import { $view } from "@milkdown/utils"
import { codeBlockSchema } from "@milkdown/kit/preset/commonmark"
import type { useNodeViewFactory } from "@prosemirror-adapter/react"
import { CalloutNodeView } from "./node-view"

export const createCalloutBlocksPlugin = (nodeViewFactory: ReturnType<typeof useNodeViewFactory>) =>
  $view(codeBlockSchema.node, () =>
    nodeViewFactory({
      component: CalloutNodeView,
    })
  )
