"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent, type MouseEvent } from "react"
import Markdown from "react-markdown"
import { FeatherMinus, FeatherSend, FeatherSparkles, FeatherLoader2, FeatherX } from "@subframe/core"
import { Button } from "~/ui/components/Button"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useThread, toRenderMessages, type RenderMessage } from "~/lib/threads"
import { filterCodeBlocks } from "~/lib/streaming/filter"
import { PlanProgressCard } from "~/ui/components/ai/PlanProgressCard"
import { ExplorationCard } from "~/ui/components/ai/ExplorationCard"
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
  <div className="prose prose-sm text-sm text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
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

type MessageRendererProps = {
  message: RenderMessage
  initiator: Participant
  recipient: Participant
}

const MessageRenderer = ({ message, initiator, recipient }: MessageRendererProps) => {
  switch (message.type) {
    case "text": {
      const from = message.role === "user" ? initiator : recipient
      return (
        <MessageBubble from={from}>
          <MessageContent content={message.content} />
        </MessageBubble>
      )
    }
    case "plan":
      return (
        <MessageBubble from={recipient}>
          <PlanProgressCard
            steps={message.plan.steps}
            currentStep={message.currentStep}
            aborted={message.aborted}
          />
        </MessageBubble>
      )
    case "exploration":
      return (
        <MessageBubble from={recipient}>
          <ExplorationCard exploration={message.exploration} />
        </MessageBubble>
      )
  }
}

type NabuChatWindowProps = {
  threadId: string
  index: number
}

const NabuChatWindow = ({ threadId, index }: NabuChatWindowProps) => {
  const { closeThread, query, project, navigate } = useNabuSidebar()
  const deps = useMemo(() => ({ query, project: project ?? undefined, navigate }), [query, project, navigate])
  const { thread, send, execute, cancel, isExecuting, streaming, history } = useThread(threadId)
  const messages = useMemo(() => toRenderMessages(history), [history])
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { position, handleMouseDown } = useDraggable({ x: 16 + index * 20, y: 16 + index * 20 })

  useEffect(() => {
    if (!thread || isExecuting || history.length === 0) return
    const lastBlock = history[history.length - 1]
    if (lastBlock.type === "text") return
    execute(deps)
  }, [thread, isExecuting, history, execute, deps])

  useEffect(() => {
    if (!isExecuting && history.length > 0) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [isExecuting, history.length])

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    send(inputValue.trim(), deps)
    setInputValue("")
  }, [inputValue, send, deps])

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

  const { initiator, recipient } = thread
  const variant = recipient.variant

  return (
    <div
      style={{ right: position.x, bottom: position.y }}
      className={`fixed z-50 flex h-[600px] w-80 flex-col rounded-lg border border-solid bg-default-background shadow-xl ${variantToBorder[variant]}`}
    >
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
          <span className="text-body-bold font-body-bold text-default-font">
            Chat with {recipient.name}
          </span>
        </div>
        <IconButton
          variant="neutral-tertiary"
          size="small"
          icon={<FeatherMinus />}
          onClick={handleClose}
        />
      </div>

      <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-3 px-4 py-3">
        {messages.map((message, i) => (
          <MessageRenderer
            key={i}
            message={message}
            initiator={initiator}
            recipient={recipient}
          />
        ))}
        {isExecuting && (
          <MessageBubble from={recipient}>
            {(() => {
              const filtered = streaming ? filterCodeBlocks(streaming) : null
              return filtered ? (
                <MessageContent content={filtered} />
              ) : (
                <FeatherLoader2 className="w-4 h-4 text-brand-600 animate-spin" />
              )
            })()}
          </MessageBubble>
        )}
      </AutoScroll>

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
        {isExecuting ? (
          <Button variant="neutral-secondary" size="small" icon={<FeatherX />} onClick={cancel}>
            Cancel
          </Button>
        ) : (
          <IconButton
            variant="brand-primary"
            size="small"
            icon={<FeatherSend />}
            onClick={handleSend}
            disabled={!inputValue.trim()}
          />
        )}
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
