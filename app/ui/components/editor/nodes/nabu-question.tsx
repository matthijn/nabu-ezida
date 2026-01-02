import { useCallback, useId, useEffect, useMemo } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import type { Participant } from "~/domain/participant"
import { createThread, deleteThread, useThread, type DocumentContext, type BlockContext } from "~/lib/threads"
import { NabuMentionInput, NabuThreadIndicator, useNabuSidebar } from "~/ui/components/nabu"
import { useEditorDocument } from "../context"

const extractBlockContext = (node: { type: { name: string }; textContent: string; attrs?: { blockId?: string } }): BlockContext => ({
  id: node.attrs?.blockId ?? "unknown",
  type: node.type.name,
  textContent: node.textContent.slice(0, 200),
})

export const NabuQuestionView = ({ node, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) => {
  const threadId = useId()
  const { openThread } = useNabuSidebar()
  const { thread } = useThread(threadId)
  const docInfo = useEditorDocument()

  const initiator: Participant = node.attrs.initiator
  const recipient: Participant = node.attrs.recipient
  const hasSubmitted: boolean = node.attrs.hasSubmitted ?? false
  const preview: string = node.attrs.preview ?? ""

  const documentContext = useMemo((): DocumentContext | null => {
    if (!docInfo || !editor) return null

    const pos = typeof getPos === "function" ? getPos() : null
    if (pos === null || pos === undefined) return null

    const $pos = editor.state.doc.resolve(pos)
    const parent = $pos.parent
    const nodeIndex = $pos.index()

    let blockBefore: BlockContext | null = null
    let blockAfter: BlockContext | null = null

    if (nodeIndex > 0) {
      const beforeNode = parent.child(nodeIndex - 1)
      if (beforeNode) blockBefore = extractBlockContext(beforeNode)
    }

    if (nodeIndex < parent.childCount - 1) {
      const afterNode = parent.child(nodeIndex + 1)
      if (afterNode) blockAfter = extractBlockContext(afterNode)
    }

    return {
      documentId: docInfo.documentId,
      documentName: docInfo.documentName,
      blockBefore,
      blockAfter,
    }
  }, [docInfo, editor, getPos])

  useEffect(() => {
    return () => {
      deleteThread(threadId)
    }
  }, [threadId])

  const handleSend = useCallback(
    (message: string) => {
      createThread(threadId, initiator, recipient, message, documentContext)

      updateAttributes({
        hasSubmitted: true,
        preview: message,
      })

      openThread(threadId)
    },
    [updateAttributes, openThread, threadId, initiator, recipient, documentContext]
  )

  const handleCancel = useCallback(() => {
    deleteNode()
  }, [deleteNode])

  const handleIndicatorClick = useCallback(() => {
    openThread(threadId)
  }, [openThread, threadId])

  const messageCount = thread?.messages.length ?? 0

  if (!hasSubmitted) {
    return (
      <NodeViewWrapper className="my-2">
        <NabuMentionInput
          recipient={recipient}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="my-2">
      <NabuThreadIndicator
        initiator={initiator}
        recipient={recipient}
        preview={preview}
        messageCount={messageCount}
        onClick={handleIndicatorClick}
      />
    </NodeViewWrapper>
  )
}
