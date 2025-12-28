"use client"

import { useState, useCallback, useEffect, useRef, type KeyboardEvent } from "react"
import Markdown from "react-markdown"
import { FeatherMinus, FeatherSend, FeatherSparkles, FeatherLoader2 } from "@subframe/core"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useThread, type ConversationMessage } from "~/lib/threads"
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

export const NabuChatSidebar = () => {
  const { activeThread, closeThread } = useNabuSidebar()
  const { thread, send, cancel, isExecuting } = useThread(activeThread)
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const lastThreadId = useRef<string | null>(null)

  // Send initial message when opening a new thread
  useEffect(() => {
    if (!activeThread || !thread) return
    if (lastThreadId.current === activeThread) return
    if (thread.messages.length > 1) return // Already has conversation

    lastThreadId.current = activeThread
    setInputValue("")
    send(thread.messages[0].content)
  }, [activeThread, thread, send])

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
    closeThread()
  }, [cancel, closeThread])

  if (!activeThread || !thread) {
    return null
  }

  const { initiator, recipient, messages, streaming } = thread
  const variant = recipient.variant

  return (
    <div
      className={`fixed right-4 bottom-4 z-50 flex h-[400px] w-80 flex-col rounded-lg border border-solid bg-default-background shadow-xl ${variantToBorder[variant]}`}
    >
      {/* Header */}
      <div className={`flex w-full items-center justify-between rounded-t-lg px-4 py-3 ${variantToBg[variant]}`}>
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
