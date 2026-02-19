"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FeatherCheck,
  FeatherCircle,
  FeatherLoader2,
  FeatherMinus,
  FeatherRefreshCw,
  FeatherSend,
  FeatherSparkles,
  FeatherX,
} from "@subframe/core"
import { Button } from "~/ui/components/Button"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useChat } from "~/lib/chat"
import { derive, hasActivePlan } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type LeafMessage, type PlanHeader, type PlanItem, type PlanChild, type PlanStep, type PlanSection, type PlanSectionGroup, type StepStatus } from "~/lib/chat/group"
import { getSpinnerLabel } from "~/lib/chat/spinnerLabel"
import { useFiles } from "~/hooks/useFiles"
import { preprocessStreaming } from "~/lib/streaming/filter"
import { AbortBox } from "~/ui/components/ai/StepsBlock"
import { useDraggable } from "~/hooks/useDraggable"
import { useResizable } from "~/hooks/useResizable"
import type { Participant } from "~/domain/participant"
import { createEntityLinkComponents } from "~/ui/components/markdown/createEntityLinkComponents"
import { useNabu } from "./context"

const encodeUrlForMarkdown = (url: string): string =>
  url.replace(/"/g, "%22")

const fixMarkdownUrls = (content: string): string =>
  content.replace(/\]\(([^)<>]+)\)/g, (_, url: string) => `](<${encodeUrlForMarkdown(url)}>)`)

const allowFileProtocol = (url: string): string => url

type MessageContentProps = {
  content: string
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const remarkPlugins = [remarkGfm]

const ScrollableTable = ({ node, ...props }: React.ComponentProps<"table"> & { node?: unknown }) => (
  <div className="overflow-x-auto">
    <table {...props} />
  </div>
)

const MessageContent = ({ content, files, projectId, navigate }: MessageContentProps) => (
  <Markdown remarkPlugins={remarkPlugins} components={{ ...createEntityLinkComponents({ files, projectId, navigate }), table: ScrollableTable }} urlTransform={allowFileProtocol}>
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
  <div className="flex w-full items-end justify-end">
    <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-4 py-2 shadow-sm max-w-[80%]">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0 [&_a]:text-brand-700 [&_a]:no-underline">
        {children}
      </div>
    </div>
  </div>
)

const AssistantBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full items-start">
    <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[80%]">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0 [&_a]:no-underline">
        {children}
      </div>
    </div>
  </div>
)

const stepIconComponent: Record<StepStatus, React.ComponentType<{ className?: string }>> = {
  completed: FeatherCheck,
  active: FeatherCircle,
  pending: FeatherCircle,
  cancelled: FeatherX,
}

const stepIconColor: Record<StepStatus, string> = {
  completed: "text-success-600",
  active: "text-brand-600",
  pending: "text-neutral-400",
  cancelled: "text-neutral-400",
}

const stepTextColor: Record<StepStatus, string> = {
  completed: "text-default-font",
  active: "text-default-font",
  pending: "text-neutral-400",
  cancelled: "text-neutral-400",
}

type PlanStepRowProps = {
  step: PlanStep
  nested?: boolean
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanStepRow = ({ step, nested = false, files, projectId, navigate }: PlanStepRowProps) => {
  const sizeClass = nested ? "text-caption font-caption" : "text-body font-body"
  const Icon = stepIconComponent[step.status]
  return (
    <div className="flex w-full items-start gap-2">
      <Icon className={`${sizeClass} ${stepIconColor[step.status]} mt-0.5 flex-none`} />
      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
        <div className={`prose prose-sm [&>*]:mb-0 [&_a]:no-underline ${sizeClass} ${stepTextColor[step.status]}`}>
          <MessageContent content={step.description} files={files} projectId={projectId} navigate={navigate} />
        </div>
        {step.summary && (
          <div className="prose prose-sm [&>*]:mb-0 [&_a]:no-underline text-caption font-caption text-subtext-color">
            <MessageContent content={step.summary} files={files} projectId={projectId} navigate={navigate} />
          </div>
        )}
      </div>
    </div>
  )
}

const PlanSectionLabel = ({ section }: { section: PlanSection }) => (
  <span className="text-caption-bold font-caption-bold text-subtext-color">
    {section.file}
    {section.totalInFile > 1 && <span className="text-neutral-400"> · {section.indexInFile} of {section.totalInFile}</span>}
  </span>
)

type LeafRendererProps = {
  message: LeafMessage
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const LeafRenderer = ({ message, files, projectId, navigate }: LeafRendererProps) => {
  if (message.role === "user") {
    return (
      <UserBubble>
        <MessageContent content={message.content} files={files} projectId={projectId} navigate={navigate} />
      </UserBubble>
    )
  }
  return (
    <AssistantBubble>
      <MessageContent content={message.content} files={files} projectId={projectId} navigate={navigate} />
    </AssistantBubble>
  )
}

const isPlanStep = (child: PlanChild): child is PlanStep => child.type === "plan-step"
const isPlanSection = (child: PlanChild): child is PlanSection => child.type === "plan-section"
const isPlanSectionGroup = (child: PlanChild): child is PlanSectionGroup => child.type === "plan-section-group"
const isLeafMessage = (child: PlanChild): child is LeafMessage =>
  child.type === "text"

const PlanLeafInline = ({ message, files, projectId, navigate }: { message: LeafMessage; files: Record<string, string>; projectId: string | null; navigate?: (url: string) => void }) => {
  if (message.role === "user") {
    return (
      <div className="flex w-full items-end justify-end">
        <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-3 py-1.5 shadow-sm max-w-[90%]">
          <div className="prose prose-sm text-caption font-caption text-default-font [&>*]:mb-0 [&_a]:no-underline">
            <MessageContent content={message.content} files={files} projectId={projectId} navigate={navigate} />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex w-full items-start mt-1">
      <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-3 py-1.5 max-w-[90%]">
        <div className="prose prose-sm text-caption font-caption text-default-font [&>*]:mb-0 [&_a]:no-underline">
          <MessageContent content={message.content} files={files} projectId={projectId} navigate={navigate} />
        </div>
      </div>
    </div>
  )
}

const SectionGroupRenderer = ({ group, files, projectId, navigate }: { group: PlanSectionGroup; files: Record<string, string>; projectId: string | null; navigate?: (url: string) => void }) => (
  <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 pl-3 py-1 ml-2">
    <div className={`flex w-full flex-col items-start gap-1${group.dimmed ? " opacity-50" : ""}`}>
      <PlanSectionLabel section={group.section} />
      {group.children.map((child, i) =>
        child.type === "plan-step"
          ? <PlanStepRow key={i} step={child} nested files={files} projectId={projectId} navigate={navigate} />
          : <PlanLeafInline key={i} message={child} files={files} projectId={projectId} navigate={navigate} />
      )}
    </div>
  </div>
)

type PlanChildRendererProps = {
  child: PlanChild
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanChildRenderer = ({ child, files, projectId, navigate }: PlanChildRendererProps) => {
  if (isPlanStep(child)) return <PlanStepRow step={child} files={files} projectId={projectId} navigate={navigate} />
  if (isPlanSection(child)) return <PlanSectionLabel section={child} />
  if (isLeafMessage(child)) return <PlanLeafInline message={child} files={files} projectId={projectId} navigate={navigate} />
  return null
}

type PlanHeaderRendererProps = {
  header: PlanHeader
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanHeaderRenderer = ({ header, files, projectId, navigate }: PlanHeaderRendererProps) => (
  <div className="flex w-full flex-col items-start gap-1 py-1">
    <div className="prose prose-sm [&>*]:mb-0 [&_a]:no-underline text-body-bold font-body-bold text-default-font">
      <MessageContent content={header.task} files={files} projectId={projectId} navigate={navigate} />
    </div>
    {header.aborted && <AbortBox />}
  </div>
)

const PlanItemRenderer = ({ item, files, projectId, navigate }: { item: PlanItem; files: Record<string, string>; projectId: string | null; navigate?: (url: string) => void }) => {
  if (isPlanSectionGroup(item.child))
    return <SectionGroupRenderer group={item.child} files={files} projectId={projectId} navigate={navigate} />
  return (
    <div className={`flex w-full flex-col items-start${item.section ? " ml-3" : ""}${item.dimmed ? " opacity-50" : ""}`}>
      <PlanChildRenderer child={item.child} files={files} projectId={projectId} navigate={navigate} />
    </div>
  )
}

type PlanMessage = PlanHeader | PlanItem

type PlanSegment = { type: "plan-segment"; items: PlanMessage[] }
type RenderSegment = LeafMessage | PlanSegment

const isPlanRelated = (m: GroupedMessage): m is PlanMessage =>
  m.type === "plan-header" || m.type === "plan-item"

const isPlanSegment = (s: RenderSegment): s is PlanSegment =>
  s.type === "plan-segment"

const toRenderSegments = (messages: GroupedMessage[]): RenderSegment[] =>
  messages.reduce<RenderSegment[]>((acc, m) => {
    if (!isPlanRelated(m)) return [...acc, m]
    const prev = acc[acc.length - 1]
    if (prev && isPlanSegment(prev)) {
      return [...acc.slice(0, -1), { type: "plan-segment", items: [...prev.items, m] }]
    }
    return [...acc, { type: "plan-segment", items: [m] }]
  }, [])

type PlanSegmentItemRendererProps = {
  item: PlanMessage
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanSegmentItemRenderer = ({ item, files, projectId, navigate }: PlanSegmentItemRendererProps) => {
  switch (item.type) {
    case "plan-header":
      return <PlanHeaderRenderer header={item} files={files} projectId={projectId} navigate={navigate} />
    case "plan-item":
      return <PlanItemRenderer item={item} files={files} projectId={projectId} navigate={navigate} />
  }
}

type PlanSegmentRendererProps = {
  items: PlanMessage[]
  active: boolean
  streamingText: string | null
  spinnerLabel: string | null
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanSegmentRenderer = ({ items, active, streamingText, spinnerLabel, files, projectId, navigate }: PlanSegmentRendererProps) => (
    <div className="flex w-full flex-col items-start gap-2 border-l-2 border-solid border-neutral-200 pl-3 pr-2 py-2 my-1">
      {items.map((item, i) => (
        <PlanSegmentItemRenderer key={i} item={item} files={files} projectId={projectId} navigate={navigate} />
      ))}
      {active && streamingText && (
        <PlanLeafInline message={{ type: "text", role: "assistant", content: streamingText }} files={files} projectId={projectId} navigate={navigate} />
      )}
      {active && spinnerLabel && <LoadingBubble label={spinnerLabel} />}
    </div>
)

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

const getFirstSentence = (text: string): string | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const match = trimmed.match(/^[^\n.!?]+/)
  return match?.[0].replace(/^\*\*|\*\*$/g, "").trim() || null
}

type LoadingBubbleProps = {
  label: string
}

const LoadingBubble = ({ label }: LoadingBubbleProps) => (
  <div className="flex w-full items-start">
    <div className="flex items-center gap-2 rounded-2xl bg-neutral-100 px-4 py-2">
      <FeatherLoader2 className="text-body text-brand-600 flex-none animate-spin" />
      <span className="text-body font-body text-subtext-color">{label}</span>
    </div>
  </div>
)

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
  const isStreamingText = streaming && !streamingToolName
  const streamingText = isStreamingText ? preprocessStreaming(streaming) : null
  const messages = useMemo(() => toGroupedMessages(history, derived), [history, derived])
  const segments = useMemo(() => toRenderSegments(messages), [messages])
  const activePlan = hasActivePlan(derived.plans)
  const lastPlanIdx = segments.reduce<number>((acc, s, i) => isPlanSegment(s) ? i : acc, -1)

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
    if (loading || !inputValue.trim()) return
    send(inputValue.trim(), getDeps())
    setInputValue("")
  }, [loading, inputValue, send, getDeps])

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
  const reasoningLabel = getFirstSentence(streamingReasoning)
  const spinnerLabel = loading && !streamingText
    ? (reasoningLabel ?? getSpinnerLabel(history, streamingToolName))
    : null

  return (
    <div
      style={{ right: position.x, bottom: position.y, width: size.width, height: size.height }}
      className="fixed z-50 flex flex-col rounded-xl border border-solid border-neutral-border bg-white shadow-lg overflow-hidden"
    >
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute -left-1 -top-1 z-10 h-4 w-4 cursor-nwse-resize"
      />
      <div
        onMouseDown={handleMouseDown}
        className="flex w-full cursor-move items-center justify-between border-b border-solid border-neutral-border bg-white px-4 py-3"
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

      <AutoScroll className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-2 px-4 py-4 overflow-auto">
        {messages.length === 0 && !loading && (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-body font-body text-subtext-color">How can I help you today?</span>
          </div>
        )}
        {segments.map((segment, i) =>
          isPlanSegment(segment) ? (
            <PlanSegmentRenderer
              key={i}
              items={segment.items}
              active={i === lastPlanIdx && activePlan}
              streamingText={i === lastPlanIdx && activePlan && loading ? streamingText : null}
              spinnerLabel={i === lastPlanIdx && activePlan ? spinnerLabel : null}
              files={files}
              projectId={params.projectId ?? null}
              navigate={navigate}
            />
          ) : (
            <LeafRenderer key={i} message={segment} files={files} projectId={params.projectId ?? null} navigate={navigate} />
          )
        )}
        {!activePlan && loading && streamingText && (
          <AssistantBubble>
            <MessageContent content={streamingText} files={files} projectId={params.projectId ?? null} navigate={navigate} />
          </AssistantBubble>
        )}
        {!activePlan && spinnerLabel && <LoadingBubble label={spinnerLabel} />}
        {error && (
          <div className="flex flex-col items-center gap-2 py-4">
            <span className="text-body font-body text-subtext-color">{error}</span>
            <Button variant="neutral-secondary" size="small" icon={<FeatherRefreshCw />} onClick={handleRetry}>
              Try again
            </Button>
          </div>
        )}
      </AutoScroll>

      <div className={`flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3 ${loading ? "bg-neutral-50" : ""}`}>
        <TextFieldUnstyled className="grow min-h-5">
          <TextFieldUnstyled.Textarea
            ref={inputRef}
            placeholder={`Message ${recipient.name}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
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
