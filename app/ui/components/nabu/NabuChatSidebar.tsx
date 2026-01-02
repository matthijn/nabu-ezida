"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent, type MouseEvent } from "react"
import Markdown from "react-markdown"
import { FeatherMinus, FeatherSend, FeatherSparkles, FeatherLoader2 } from "@subframe/core"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useThread, type ConversationMessage } from "~/lib/threads"
import { createToolHandlers } from "~/lib/agent/toolHandlers"
import type { Participant, ParticipantVariant } from "~/domain/participant"
import { useNabuSidebar } from "./context"

const variantToBorder: Record<ParticipantVariant, string> = {
  brand: "border-brand-300",
  neutral: "border-neutral-300",
  error: "border-error-300",
  success: "border-success-300",
  warning: "border-warning-300",
}

const variantToBg: Record<ParticipantVariant, string> = {
  brand: "bg-brand-50",
  neutral: "bg-neutral-50",
  error: "bg-error-50",
  success: "bg-success-50",
  warning: "bg-warning-50",
}

const MessageContent = ({ content }: { content: string }) => (
  <div className="prose prose-sm text-sm text-default-font">
    <Markdown>{content}</Markdown>
  </div>
)

type ParticipantAvatarProps = {
  participant: Participant
  size?: "x-small" | "small"
}

const ParticipantAvatar = ({ participant, size = "x-small" }: ParticipantAvatarProps) =>
  participant.type === "llm" ? (
    <IconWithBackground variant={participant.variant} size={size} icon={<FeatherSparkles />} />
  ) : participant.image ? (
    <Avatar size={size} image={participant.image}>
      {participant.initial}
    </Avatar>
  ) : (
    <Avatar variant={participant.variant} size={size}>
      {participant.initial}
    </Avatar>
  )

type MessageBubbleProps = {
  from: Participant
  children: React.ReactNode
}

const MessageBubble = ({ from, children }: MessageBubbleProps) => (
  <div className="flex w-full items-start gap-2">
    <ParticipantAvatar participant={from} />
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
      <span className="text-caption-bold font-caption-bold text-default-font">{from.name}</span>
      {children}
    </div>
  </div>
)

type Position = { x: number; y: number }

const useDraggable = (initialPosition: Position) => {
  const [position, setPosition] = useState(initialPosition)
  const dragRef = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const deltaX = e.clientX - dragRef.current.startX
      const deltaY = e.clientY - dragRef.current.startY
      setPosition({
        x: dragRef.current.startPosX - deltaX,
        y: dragRef.current.startPosY - deltaY,
      })
    }

    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [position])

  return { position, handleMouseDown }
}

type NabuChatWindowProps = {
  threadId: string
  index: number
}

const NabuChatWindow = ({ threadId, index }: NabuChatWindowProps) => {
  const { closeThread, query } = useNabuSidebar()
  const toolHandlers = useMemo(() => createToolHandlers({ query }), [query])
  const { thread, send, execute, cancel, isExecuting, streaming } = useThread(threadId, { toolHandlers })
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const lastSentRef = useRef<string | null>(null)
  const { position, handleMouseDown } = useDraggable({ x: 16 + index * 20, y: 16 + index * 20 })

  // Execute initial message when opening a new thread
  useEffect(() => {
    if (!thread) return
    if (lastSentRef.current === threadId) return
    if (thread.messages.length > 1) return // Already has conversation

    lastSentRef.current = threadId
    setInputValue("")
    execute()
  }, [threadId, thread, execute])

  // Focus input when not executing
  useEffect(() => {
    if (!isExecuting && thread && thread.messages.length > 0) {
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [isExecuting, thread])

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    send(inputValue.trim())
    setInputValue("")
  }, [inputValue, send])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleClose = useCallback(() => {
    cancel()
    closeThread(threadId)
  }, [cancel, closeThread, threadId])

  if (!thread) {
    return null
  }

  const { initiator, recipient, messages } = thread
  const variant = recipient.variant

  return (
    <div
      style={{ right: position.x, bottom: position.y }}
      className={`fixed z-50 flex h-[400px] w-80 flex-col rounded-lg border border-solid bg-default-background shadow-xl ${variantToBorder[variant]}`}
    >
      {/* Header - draggable */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex w-full cursor-move items-center justify-between rounded-t-lg px-4 py-3 ${variantToBg[variant]}`}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <ParticipantAvatar participant={initiator} size="small" />
            <div className="-ml-1">
              <ParticipantAvatar participant={recipient} size="small" />
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-body-bold font-body-bold text-default-font">
              Chat with {recipient.name}
            </span>
            <span className="text-caption font-caption text-subtext-color">
              {messages.length} messages
            </span>
          </div>
        </div>
        <IconButton
          variant="neutral-tertiary"
          size="small"
          icon={<FeatherMinus />}
          onClick={handleClose}
        />
      </div>

      {/* Messages */}
      <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 py-3">
        {messages.map((msg, i) => (
          <MessageBubble key={i} from={msg.from}>
            <MessageContent content={msg.content} />
          </MessageBubble>
        ))}
        {isExecuting && (
          <MessageBubble from={recipient}>
            {streaming ? (
              <MessageContent content={streaming} />
            ) : (
              <FeatherLoader2 className="w-4 h-4 text-brand-600 animate-spin" />
            )}
          </MessageBubble>
        )}
      </AutoScroll>

      {/* Input */}
      <div className="flex w-full items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
        <ParticipantAvatar participant={initiator} />
        <TextFieldUnstyled className="grow">
          <TextFieldUnstyled.Input
            ref={inputRef}
            placeholder={`Message ${recipient.name}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isExecuting}
          />
        </TextFieldUnstyled>
        <IconButton
          variant="brand-primary"
          size="small"
          icon={<FeatherSend />}
          onClick={handleSend}
          disabled={isExecuting || !inputValue.trim()}
        />
      </div>
    </div>
  )
}

export const NabuChatSidebar = () => {
  const { openThreads } = useNabuSidebar()

  return (
    <>
      {openThreads.map((threadId, index) => (
        <NabuChatWindow key={threadId} threadId={threadId} index={index} />
      ))}
    </>
  )
}
