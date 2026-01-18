import { ReactNodeViewRenderer } from "@tiptap/react"
import { Paragraph as BaseParagraph } from "@tiptap/extension-paragraph"
import { Heading as BaseHeading } from "@tiptap/extension-heading"
import { Blockquote as BaseBlockquote } from "@tiptap/extension-blockquote"
import { CodeBlock as BaseCodeBlock } from "@tiptap/extension-code-block"
import { BulletList as BaseBulletList } from "@tiptap/extension-bullet-list"
import { OrderedList as BaseOrderedList } from "@tiptap/extension-ordered-list"
import { Table as BaseTable } from "@tiptap/extension-table"
import { TaskList as BaseTaskList } from "@tiptap/extension-task-list"
import { Image as BaseImage } from "@tiptap/extension-image"

import { withLock } from "./with-lock"
import { ParagraphView } from "./paragraph"
import { HeadingView } from "./heading"
import { BlockquoteView } from "./blockquote"
import { CodeBlockView } from "./code-block"
import { BulletListView } from "./bullet-list"
import { OrderedListView } from "./ordered-list"
import { TableView } from "./table"
import { TaskListView } from "./task-list"
import { ImageView } from "./image"

export const Paragraph = BaseParagraph.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(ParagraphView)),
})

export const Heading = BaseHeading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-background-color"),
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) return {}
          return { "data-background-color": attributes.backgroundColor }
        },
      },
    }
  },
  addNodeView: () => ReactNodeViewRenderer(withLock(HeadingView)),
})

export const Blockquote = BaseBlockquote.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(BlockquoteView)),
})

export const CodeBlock = BaseCodeBlock.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(CodeBlockView)),
})

export const BulletList = BaseBulletList.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(BulletListView)),
})

export const OrderedList = BaseOrderedList.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(OrderedListView)),
})

export const Table = BaseTable.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(TableView)),
})

export const TaskList = BaseTaskList.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(TaskListView)),
})

export const Image = BaseImage.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(ImageView)),
})
