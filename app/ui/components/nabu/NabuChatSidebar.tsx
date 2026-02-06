"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router"
import Markdown, { type Components } from "react-markdown"
import { FeatherMinus, FeatherSend, FeatherSparkles, FeatherRefreshCw, FeatherX } from "@subframe/core"
import { Button } from "~/ui/components/Button"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useChat } from "~/lib/chat"
import { derive } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type LeafMessage, type SectionGroup, type PlanGroup } from "~/lib/chat/group"
import { getPlanStatus } from "~/lib/chat/plan-status"
import { useFiles } from "~/hooks/useFiles"
import { filterCodeBlocks } from "~/lib/streaming/filter"
import { OrientationCard } from "~/ui/components/ai/OrientationCard"
import { AbortBox } from "~/ui/components/ai/StepsBlock"
import { StatusBar } from "~/ui/components/ai/StatusBar"
import { useDraggable } from "~/hooks/useDraggable"
import { useResizable } from "~/hooks/useResizable"
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

const encodeUrlForMarkdown = (url: string): string =>
  url.replace(/"/g, "%22")

const fixMarkdownUrls = (content: string): string =>
  content.replace(/\]\(([^)<>]+)\)/g, (_, url: string) => `](<${encodeUrlForMarkdown(url)}>)`)

const allowFileProtocol = (url: string): string => url

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

const AssistantText = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full">
    <div className="rounded-lg bg-neutral-50 px-3 py-3">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  </div>
)

type SectionLabelProps = {
  file: string
  indexInFile: number
  totalInFile: number
}

const SectionLabel = ({ file, indexInFile, totalInFile }: SectionLabelProps) => (
  <div className="text-caption font-caption text-subtext-color mb-1">
    Processing <span className="font-medium text-default-font">{file}</span>
    {totalInFile > 1 && <span className="text-neutral-400"> · {indexInFile} of {totalInFile}</span>}
  </div>
)

type LeafRendererProps = {
  message: LeafMessage
  projectId: string | null
  navigate?: (url: string) => void
}

const LeafRenderer = ({ message, projectId, navigate }: LeafRendererProps) => {
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
    case "orientation":
      return (
        <OrientationCard
          orientation={message.orientation}
          aborted={message.aborted}
          projectId={projectId}
          navigate={navigate}
        />
      )
  }
}

type SectionGroupRendererProps = {
  group: SectionGroup
  projectId: string | null
  navigate?: (url: string) => void
}

const SectionGroupRenderer = ({ group, projectId, navigate }: SectionGroupRendererProps) => (
  <div className="border-l-2 border-neutral-200 pl-2 space-y-3">
    <SectionLabel file={group.file} indexInFile={group.indexInFile} totalInFile={group.totalInFile} />
    {group.messages.map((msg, i) => (
      <LeafRenderer key={i} message={msg} projectId={projectId} navigate={navigate} />
    ))}
  </div>
)

type PlanGroupRendererProps = {
  group: PlanGroup
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanGroupRenderer = ({ group, projectId, navigate }: PlanGroupRendererProps) => (
  <div className="border-l-2 border-brand-200 pl-3 space-y-3">
    <span className="text-caption font-caption text-brand-600">{group.task}</span>
    {group.children.map((child, i) =>
      child.type === "section-group"
        ? <SectionGroupRenderer key={i} group={child} projectId={projectId} navigate={navigate} />
        : <LeafRenderer key={i} message={child} projectId={projectId} navigate={navigate} />
    )}
    {group.completed && <span className="text-caption text-success-600">Completed</span>}
    {group.aborted && <AbortBox />}
  </div>
)

type GroupedMessageRendererProps = {
  message: GroupedMessage
  projectId: string | null
  navigate?: (url: string) => void
}

const GroupedMessageRenderer = ({ message, projectId, navigate }: GroupedMessageRendererProps) => {
  if (message.type === "plan-group") {
    return <PlanGroupRenderer group={message} projectId={projectId} navigate={navigate} />
  }
  return <LeafRenderer message={message} projectId={projectId} navigate={navigate} />
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

export const NabuChatSidebar = () => {
  const { minimized, minimizeChat, chatWidth, chatHeight, setChatSize } = useNabu()
  const navigate = useNavigate()
  const params = useParams<{ projectId: string }>()

  const getDeps = useCallback(() => {
    const project = params.projectId ? { id: params.projectId } : undefined
    return { project, navigate }
  }, [navigate, params.projectId])
  const { chat, send, run, cancel, loading, streaming, streamingReasoning, streamingToolName, history, error } = useChat()
  const { files } = useFiles()

  const derived = useMemo(() => derive(history, files), [history, files])
  const messages = useMemo(() => toGroupedMessages(history, derived), [history, derived])
  const planStatus = useMemo(() => getPlanStatus(derived), [derived])

  const [inputValue, setInputValue] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { position, handleMouseDown } = useDraggable({ x: 16, y: 16 })
  const { size, handleResizeMouseDown } = useResizable(
    { width: chatWidth, height: chatHeight },
  )

  useEffect(() => {
    setChatSize(size.width, size.height)
  }, [size.width, size.height])

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

  const { recipient } = chat
  const streamingText = streaming ? filterCodeBlocks(streaming) : null

  return (
    <div
      style={{ right: position.x, bottom: position.y, width: size.width, height: size.height }}
      className="fixed z-50 flex flex-col rounded-lg border border-solid border-brand-300 bg-default-background shadow-xl"
    >
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute -left-1 -top-1 z-10 h-4 w-4 cursor-nwse-resize"
      />
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
          <GroupedMessageRenderer
            key={i}
            message={message}
            projectId={null}
            navigate={navigate}
          />
        ))}
        {loading && streamingText && (
          <AssistantText>
            <MessageContent content={streamingText} projectId={null} navigate={navigate} />
          </AssistantText>
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

      <StatusBar
        planStatus={planStatus}
        loading={loading}
        history={history}
        streamingReasoning={streamingReasoning}
        streamingToolName={streamingToolName}
      />

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
