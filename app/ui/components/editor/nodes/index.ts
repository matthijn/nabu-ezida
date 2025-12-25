import { ReactNodeViewRenderer } from "@tiptap/react"
import { Node } from "@tiptap/core"
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
import { NabuQuestionView } from "./nabu-question"

export const Paragraph = BaseParagraph.extend({
  addNodeView: () => ReactNodeViewRenderer(withLock(ParagraphView)),
})

export const Heading = BaseHeading.extend({
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

export const NabuQuestion = Node.create({
  name: "nabuQuestion",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      initiator: { default: null },
      recipient: { default: null },
      messages: { default: [] },
      draft: { default: "" },
    }
  },

  parseHTML() {
    return [{ tag: "div[data-nabu-question]" }]
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-nabu-question": "" }]
  },

  addNodeView() {
    return ReactNodeViewRenderer(NabuQuestionView)
  },
})
