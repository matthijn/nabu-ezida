import { useCallback, useId, useEffect } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import type { Participant } from "~/domain/participant"
import { createThread, deleteThread, useThread } from "~/lib/threads"
import { NabuMentionInput, NabuThreadIndicator, useNabuSidebar } from "~/ui/components/nabu"

export const NabuQuestionView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const threadId = useId()
  const { openThread } = useNabuSidebar()
  const { thread } = useThread(threadId)

  const initiator: Participant = node.attrs.initiator
  const recipient: Participant = node.attrs.recipient
  const hasSubmitted: boolean = node.attrs.hasSubmitted ?? false
  const preview: string = node.attrs.preview ?? ""

  // Clean up thread when node is deleted
  useEffect(() => {
    return () => {
      deleteThread(threadId)
    }
  }, [threadId])

  const handleSend = useCallback(
    (message: string) => {
      createThread(threadId, initiator, recipient, message)

      updateAttributes({
        hasSubmitted: true,
        preview: message,
      })

      openThread(threadId)
    },
    [updateAttributes, openThread, threadId, initiator, recipient]
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
