import { useState, useCallback, useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import Markdown from "react-markdown"
import { FeatherLoader2 } from "@subframe/core"
import { Conversation, Message } from "~/ui/components/ai"
import { type Participant } from "~/domain/participant"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { useBlockExecution, getSharedContext, pushSharedContext, subscribeToSharedContext } from "~/lib/llm"
import type { Message as LLMMessage } from "~/domain/llm"

type ConversationMessage = {
  from: Participant
  content: string
}

const isInitiatorTurn = (messages: ConversationMessage[], initiator: Participant): boolean => {
  if (messages.length === 0) return true
  const lastMessage = messages[messages.length - 1]
  return lastMessage.from.id !== initiator.id
}

const toRole = (from: Participant): "user" | "assistant" =>
  from.type === "llm" ? "assistant" : "user"

const toLLMMessages = (messages: ConversationMessage[]): LLMMessage[] =>
  messages.map((m) => ({ role: toRole(m.from), content: m.content }))

const useSharedContext = () => useSyncExternalStore(subscribeToSharedContext, getSharedContext)

const MessageContent = ({ content }: { content: string }) => (
  <div className="prose prose-sm text-default-font">
    <Markdown>{content}</Markdown>
  </div>
)

export const NabuQuestionView = ({ node, updateAttributes, deleteNode }: NodeViewProps) => {
  const [inputValue, setInputValue] = useState(node.attrs.draft ?? "")
  const [followingUp, setFollowingUp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const messages: ConversationMessage[] = node.attrs.messages ?? []
  const initiator: Participant = node.attrs.initiator
  const recipient: Participant = node.attrs.recipient

  const sharedContext = useSharedContext()
  const hasAddedResponse = useRef(false)
  const isFirstMount = useRef(true)

  const { state: llmState, send: sendToLlm, cancel: cancelLlm, isExecuting } = useBlockExecution({
    prompt: "nabu",
    history: toLLMMessages(messages),
    sharedContext,
    pushShared: pushSharedContext,
    toolHandlers: {},
  })

  const derivedTurn = isInitiatorTurn(messages, initiator)
  const showInput = (derivedTurn || followingUp) && !isExecuting

  useEffect(() => {
    if (llmState.status === "done" && !hasAddedResponse.current) {
      const assistantMessages = llmState.messages.filter((m) => m.role === "assistant" && m.content)
      if (assistantMessages.length > 0) {
        const lastAssistant = assistantMessages[assistantMessages.length - 1]
        if (lastAssistant.content) {
          hasAddedResponse.current = true
          updateAttributes({
            messages: [...node.attrs.messages, { from: recipient, content: lastAssistant.content }],
          })
        }
      }
    }
  }, [llmState.status, llmState.messages, recipient, node.attrs.messages, updateAttributes])

  useEffect(() => {
    if (isFirstMount.current && showInput) {
      isFirstMount.current = false
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [showInput])

  const updateDraft = useCallback(
    (value: string) => {
      setInputValue(value)
      updateAttributes({ draft: value })
    },
    [updateAttributes]
  )

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return

    const newMessage: ConversationMessage = {
      from: initiator,
      content: inputValue.trim(),
    }

    hasAddedResponse.current = false
    updateAttributes({
      messages: [...messages, newMessage],
      draft: "",
    })

    sendToLlm(inputValue.trim())
    setInputValue("")
    setFollowingUp(false)
  }, [inputValue, messages, initiator, updateAttributes, sendToLlm])

  const handleCancel = useCallback(() => {
    cancelLlm()
    deleteNode()
  }, [cancelLlm, deleteNode])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const focusInput = useCallback(() => {
    setFollowingUp(true)
    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }, [])

  if (showInput) {
    return (
      <NodeViewWrapper className="my-4">
        <Conversation
          initiator={initiator}
          recipient={recipient}
          mode="chat"
          onSend={handleSend}
          onCancel={handleCancel}
          onClick={focusInput}
        >
          {messages.map((msg, i) => (
            <Message key={i} from={msg.from}>
              <MessageContent content={msg.content} />
            </Message>
          ))}
          <Message from={initiator}>
            <TextFieldUnstyled className="h-auto w-full flex-none">
              <TextFieldUnstyled.Input
                ref={inputRef}
                placeholder={`Message ${recipient.name}...`}
                value={inputValue}
                onChange={(e) => updateDraft(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </TextFieldUnstyled>
          </Message>
        </Conversation>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper className="my-4">
      <Conversation
        initiator={initiator}
        recipient={recipient}
        mode="progress"
        onCancel={handleCancel}
        onClick={focusInput}
      >
        {messages.map((msg, i) => (
          <Message key={i} from={msg.from}>
            <MessageContent content={msg.content} />
          </Message>
        ))}
        {isExecuting && (
          <Message from={recipient}>
            {llmState.streaming ? (
              <MessageContent content={llmState.streaming} />
            ) : (
              <FeatherLoader2 className="w-4 h-4 text-brand-600 animate-spin" />
            )}
          </Message>
        )}
      </Conversation>
    </NodeViewWrapper>
  )
}
