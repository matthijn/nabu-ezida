"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent, type MouseEvent } from "react"
import Markdown from "react-markdown"
import { FeatherMinus, FeatherSend, FeatherSparkles, FeatherLoader2, FeatherX, FeatherRefreshCw } from "@subframe/core"
import { Button } from "~/ui/components/Button"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useChat, toRenderMessages, type RenderMessage } from "~/lib/chat"
import { filterCodeBlocks } from "~/lib/streaming/filter"
import { PlanProgressCard } from "~/ui/components/ai/PlanProgressCard"
import { ExplorationCard } from "~/ui/components/ai/ExplorationCard"
import type { Participant } from "~/domain/participant"
import { useNabu } from "./context"

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

type NabuFloatingButtonProps = {
  hasChat: boolean
}

const NabuFloatingButton = ({ hasChat }: NabuFloatingButtonProps) => {
  const { startChat, restoreChat } = useNabu()

  const handleClick = hasChat ? restoreChat : () => startChat(null)

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors"
    >
      <FeatherSparkles className="h-6 w-6 shrink-0" />
    </button>
  )
}

export const NabuChatSidebar = () => {
  const { minimized, minimizeChat, query, project, navigate } = useNabu()
  const deps = useMemo(() => ({ query, project: project ?? undefined, navigate }), [query, project, navigate])
  const { chat, send, execute, retry, cancel, isExecuting, streaming, history, error } = useChat()
  const messages = useMemo(() => toRenderMessages(history), [history])
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const { position, handleMouseDown } = useDraggable({ x: 16, y: 16 })
  useEffect(() => {
    if (chat && !isExecuting) execute(deps)
  }, [chat, isExecuting, history, execute, deps])

  useEffect(() => {
    if (chat) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [chat])

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

  const handleMinimize = useCallback(() => {
    minimizeChat()
  }, [minimizeChat])

  const handleRetry = useCallback(() => {
    retry(deps)
  }, [retry, deps])

  const showFloatingButton = !chat || minimized
  if (showFloatingButton) return <NabuFloatingButton hasChat={!!chat} />

  const { initiator, recipient } = chat

  return (
    <div
      style={{ right: position.x, bottom: position.y }}
      className="fixed z-50 flex h-[600px] w-80 flex-col rounded-lg border border-solid border-brand-300 bg-default-background shadow-xl"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex w-full cursor-move items-center justify-between rounded-t-lg bg-brand-50 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <ParticipantAvatar participant={recipient} size="small" />
          <span className="text-body-bold font-body-bold text-default-font">
            {recipient.name}
          </span>
        </div>
        <IconButton
          variant="neutral-tertiary"
          size="small"
          icon={<FeatherMinus />}
          onClick={handleMinimize}
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
        {error && (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-sm text-subtext-color">{error}</span>
            <Button variant="neutral-secondary" size="small" icon={<FeatherRefreshCw />} onClick={handleRetry}>
              Try again
            </Button>
          </div>
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
