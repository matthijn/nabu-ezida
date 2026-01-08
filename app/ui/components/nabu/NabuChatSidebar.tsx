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
import { useThread, type ConversationMessage, type Plan, type Step, type TextMessage, type PlanMessage } from "~/lib/threads"
import { filterCodeBlocks } from "~/lib/streaming/filter"
import { TaskProgress, type Task as TaskProgressTask, type TaskStatus as TaskProgressStatus } from "~/ui/components/ai/TaskProgress"
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

const stepToTaskStatus = (done: boolean, isCurrentStep: boolean, isExecuting: boolean): TaskProgressStatus => {
  if (done) return "done"
  if (isCurrentStep && isExecuting) return "loading"
  return "pending"
}

const planToTasks = (plan: Plan, isExecuting: boolean): TaskProgressTask[] => {
  const firstPendingIndex = plan.steps.findIndex(s => !s.done)
  return plan.steps.map((step, index) => ({
    label: step.description,
    status: stepToTaskStatus(step.done, index === firstPendingIndex, isExecuting),
  }))
}

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
  const { closeThread, query, project } = useNabuSidebar()
  const { thread, send, execute, cancel, isExecuting, streaming } = useThread(threadId, { query, project })
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

  const { initiator, recipient, messages, plan } = thread
  const variant = recipient.variant
  const hasPlan = plan !== null && plan.steps.length > 0

  return (
    <div
      style={{ right: position.x, bottom: position.y }}
      className={`fixed z-50 flex h-[600px] w-80 flex-col rounded-lg border border-solid bg-default-background shadow-xl ${variantToBorder[variant]}`}
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
        {messages.map((msg, i) =>
          msg.type === "text" ? (
            <MessageBubble key={i} from={msg.from}>
              <MessageContent content={msg.content} />
            </MessageBubble>
          ) : (
            <MessageBubble key={i} from={msg.from}>
              <div className={msg.aborted ? "line-through opacity-60" : ""}>
                <TaskProgress
                  title={msg.plan.task}
                  tasks={planToTasks(msg.plan, false)}
                  className="bg-brand-50"
                />
              </div>
            </MessageBubble>
          )
        )}
        {hasPlan && (
          <MessageBubble from={recipient}>
            <TaskProgress
              title={plan.task}
              tasks={planToTasks(plan, isExecuting)}
              className="bg-brand-50"
            />
          </MessageBubble>
        )}
        {isExecuting && !hasPlan && (
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

      {/* Input / Cancel */}
      {isExecuting && hasPlan ? (
        <div className="flex w-full items-center justify-end border-t border-solid border-neutral-border px-4 py-3">
          <Button
            variant="neutral-secondary"
            size="small"
            icon={<FeatherX />}
            onClick={cancel}
          >
            Cancel
          </Button>
        </div>
      ) : (
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
      )}
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
