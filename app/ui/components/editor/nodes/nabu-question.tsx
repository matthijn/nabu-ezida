import { useCallback, useEffect, useMemo, useRef } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import type { Participant } from "~/domain/participant"
import { createThread, useThread, type DocumentContext, type BlockContext } from "~/lib/threads"
import { NabuMentionInput, NabuThreadIndicator, useNabuSidebar } from "~/ui/components/nabu"
import { useEditorDocument } from "../context"

const extractBlockContext = (node: { type: { name: string }; textContent: string; attrs?: { blockId?: string } }): BlockContext => ({
  id: node.attrs?.blockId ?? "unknown",
  type: node.type.name,
  textContent: node.textContent.slice(0, 200),
})

const generateThreadId = (): string => `thread-${crypto.randomUUID()}`

export const NabuQuestionView = ({ node, editor, getPos, updateAttributes, deleteNode }: NodeViewProps) => {
  const { openThread } = useNabuSidebar()

  // Generate stable threadId - use ref to keep same ID across renders until persisted
  const generatedIdRef = useRef<string | null>(null)
  if (!generatedIdRef.current && !node.attrs.threadId) {
    generatedIdRef.current = generateThreadId()
  }
  const threadId: string = node.attrs.threadId ?? generatedIdRef.current!

  // Persist threadId to attrs if not already set
  useEffect(() => {
    if (!node.attrs.threadId && generatedIdRef.current) {
      updateAttributes({ threadId: generatedIdRef.current })
    }
  }, [node.attrs.threadId, updateAttributes])
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

  // Thread persists - don't delete on unmount so chat continues in background

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

  const messageCount = thread?.agentHistory.length ?? 0

  const blockId = node.attrs.blockId as string | undefined

  if (!hasSubmitted) {
    return (
      <NodeViewWrapper className="my-2" data-block-id={blockId}>
        <NabuMentionInput
          recipient={recipient}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="my-2" data-block-id={blockId}>
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
