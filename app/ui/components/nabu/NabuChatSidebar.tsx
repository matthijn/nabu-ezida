"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useNavigate, useParams } from "react-router"
import Markdown, { type Components } from "react-markdown"
import { FeatherMinus, FeatherSend, FeatherSparkles, FeatherX, FeatherRefreshCw } from "@subframe/core"
import { Button } from "~/ui/components/Button"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useChat, toRenderMessages, getSpinnerLabel, type RenderMessage } from "~/lib/chat"
import type { Block } from "~/lib/agent"
import { useFiles } from "~/hooks/useFiles"
import { filterCodeBlocks } from "~/lib/streaming/filter"
import { PlanProgressCard } from "~/ui/components/ai/PlanProgressCard"
import { ExplorationCard } from "~/ui/components/ai/ExplorationCard"
import { useDraggable } from "~/hooks/useDraggable"
import type { Participant } from "~/domain/participant"
import { resolveFileLink } from "~/domain/spotlight"
import { useNabu } from "./context"

type MarkdownContext = {
  projectId: string | null
  navigate?: (url: string) => void
}

const createMarkdownComponents = ({ projectId, navigate }: MarkdownContext): Components => ({
  a: (props) => {
    const href = props.href as string | undefined
    const resolved = projectId && href ? resolveFileLink(href, projectId) : null
    const finalHref = resolved ?? href

    const handleClick = (e: React.MouseEvent) => {
      if (finalHref && navigate) {
        e.preventDefault()
        navigate(finalHref)
      }
    }

    return (
      <a
        href={finalHref}
        onClick={handleClick}
        className="bg-brand-100 cursor-pointer hover:bg-brand-200 no-underline font-normal"
      >
        {props.children}
      </a>
    )
  },
})

const allowFileProtocol = (url: string): string => url

const fixMarkdownUrls = (content: string): string =>
  content.replace(/\]\(([^)<>]+)\)/g, (_, url) => `](<${url}>)`)

type MessageContentProps = {
  content: string
  projectId: string | null
  navigate?: (url: string) => void
}

const MessageContent = ({ content, projectId, navigate }: MessageContentProps) => (
  <Markdown components={createMarkdownComponents({ projectId, navigate })} urlTransform={allowFileProtocol}>
    {fixMarkdownUrls(content)}
  </Markdown>
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

const UserBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full justify-end">
    <div className="max-w-[80%] rounded-lg bg-brand-100 px-3 py-2">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  </div>
)

type AssistantTextProps = {
  children: React.ReactNode
}

const AssistantText = ({ children }: AssistantTextProps) => (
  <div className="flex w-full">
    <div className="rounded-lg bg-neutral-50 px-3 py-3">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  </div>
)

type MessageRendererProps = {
  message: RenderMessage
  projectId: string | null
  navigate?: (url: string) => void
}

const MessageRenderer = ({ message, projectId, navigate }: MessageRendererProps) => {
  switch (message.type) {
    case "text":
      if (message.role === "user") {
        return (
          <UserBubble>
            <MessageContent content={message.content} projectId={projectId} navigate={navigate} />
          </UserBubble>
        )
      }
      return (
        <AssistantText>
          <MessageContent content={message.content} projectId={projectId} navigate={navigate} />
        </AssistantText>
      )
    case "plan":
      return (
        <PlanProgressCard
          steps={message.plan.steps}
          currentStep={message.currentStep}
          perSection={message.plan.perSection}
          aborted={message.aborted}
          projectId={projectId}
          navigate={navigate}
        />
      )
    case "exploration":
      return (
        <ExplorationCard
          exploration={message.exploration}
          aborted={message.aborted}
          projectId={projectId}
          navigate={navigate}
        />
      )
  }
}

type NabuFloatingButtonProps = {
  hasChat: boolean
}

const NabuFloatingButton = ({ hasChat }: NabuFloatingButtonProps) => {
  const { startChat, restoreChat } = useNabu()

  const handleClick = hasChat ? restoreChat : startChat

  return (
    <button
      onClick={handleClick}
      className="fixed bottom-6 right-10 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-colors"
    >
      <FeatherSparkles className="h-6 w-6 shrink-0" />
    </button>
  )
}

const AnimatedDots = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => (f + 1) % 3), 400)
    return () => clearInterval(interval)
  }, [])

  return <>{".".repeat(frame + 1)}</>
}

const getFirstLine = (text: string): string | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const firstLine = trimmed.split("\n")[0]
  return firstLine.replace(/^\*\*|\*\*$/g, "").trim() || null
}

type LoadingIndicatorProps = {
  streaming: string
  streamingReasoning: string
  streamingToolName: string | null
  history: Block[]
  projectId: string | null
  navigate?: (url: string) => void
}

const LoadingIndicator = ({ streaming, streamingReasoning, streamingToolName, history, projectId, navigate }: LoadingIndicatorProps) => {
  const filtered = streaming ? filterCodeBlocks(streaming) : null
  if (filtered) {
    return (
      <AssistantText>
        <MessageContent content={filtered} projectId={projectId} navigate={navigate} />
      </AssistantText>
    )
  }

  const reasoningLabel = getFirstLine(streamingReasoning)
  const label = reasoningLabel ?? getSpinnerLabel(history, streamingToolName)

  return (
    <div className="flex w-full rounded-lg bg-neutral-50 px-3 py-3">
      <AnimatePresence mode="wait">
        <motion.span
          key={label}
          className="text-body font-body text-subtext-color"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {label}<AnimatedDots />
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export const NabuChatSidebar = () => {
  const { minimized, minimizeChat } = useNabu()
  const navigate = useNavigate()
  const params = useParams<{ projectId: string }>()

  const getDeps = useCallback(() => {
    const project = params.projectId ? { id: params.projectId } : undefined
    return { project, navigate }
  }, [navigate, params.projectId])
  const { chat, send, run, cancel, loading, streaming, streamingReasoning, streamingToolName, history, error } = useChat()
  const { files } = useFiles()
  const messages = useMemo(() => toRenderMessages(history, files), [history, files])
  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { position, handleMouseDown } = useDraggable({ x: 16, y: 16 })

  useEffect(() => {
    if (chat) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [chat])

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    send(inputValue.trim(), getDeps())
    setInputValue("")
  }, [inputValue, send, getDeps])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
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
    run(getDeps())
  }, [run, getDeps])

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
        {messages.length === 0 && !loading && (
          <div className="flex h-full items-center justify-center">
            <span className="text-body font-body text-subtext-color">How can I help you today?</span>
          </div>
        )}
        {messages.map((message, i) => (
          <MessageRenderer
            key={i}
            message={message}
            projectId={null}
            navigate={navigate}
          />
        ))}
        {loading && (
          <LoadingIndicator
            streaming={streaming}
            streamingReasoning={streamingReasoning}
            streamingToolName={streamingToolName}
            history={history}
            projectId={null}
            navigate={navigate}
          />
        )}
        {error && (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-body font-body text-subtext-color">{error}</span>
            <Button variant="neutral-secondary" size="small" icon={<FeatherRefreshCw />} onClick={handleRetry}>
              Try again
            </Button>
          </div>
        )}
      </AutoScroll>

      <div className="flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3">
        <TextFieldUnstyled className="grow min-h-5">
          <TextFieldUnstyled.Textarea
            ref={inputRef}
            placeholder={`Message ${recipient.name}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
        </TextFieldUnstyled>
        {loading ? (
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
