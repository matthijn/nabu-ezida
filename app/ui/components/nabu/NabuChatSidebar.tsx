"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent } from "react"
import { useNavigate, useParams } from "react-router"
import Markdown, { type Components } from "react-markdown"
import {
  FeatherArrowRight,
  FeatherCheck,
  FeatherCircle,
  FeatherLightbulb,
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
import type { DerivedOrientation, Finding } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type LeafMessage, type PlanHeader, type PlanItem, type PlanRemainder, type PlanChild, type PlanStep, type PlanSection, type PlanSectionGroup, type StepStatus, type SectionProgress } from "~/lib/chat/group"
import { getSpinnerLabel } from "~/lib/chat/spinnerLabel"
import { useFiles } from "~/hooks/useFiles"
import { preprocessStreaming } from "~/lib/streaming/filter"
import { AbortBox } from "~/ui/components/ai/StepsBlock"
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
  <div className="flex w-full items-end justify-end">
    <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-4 py-2 shadow-sm max-w-[80%]">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0 [&_a]:text-brand-700 [&_a]:underline">
        {children}
      </div>
    </div>
  </div>
)

const AssistantBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full items-start">
    <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[80%]">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
        {children}
      </div>
    </div>
  </div>
)

const stepIcons: Record<StepStatus, React.ReactNode> = {
  completed: <FeatherCheck className="text-caption font-caption text-success-600 mt-0.5 flex-none" />,
  active: <FeatherCircle className="text-caption font-caption text-brand-600 mt-0.5 flex-none" />,
  pending: <FeatherCircle className="text-caption font-caption text-neutral-400 mt-0.5 flex-none" />,
  cancelled: <FeatherX className="text-caption font-caption text-neutral-400 mt-0.5 flex-none" />,
}

const stepTextStyles: Record<StepStatus, string> = {
  completed: "text-caption font-caption text-default-font",
  active: "text-caption font-caption text-default-font",
  pending: "text-caption font-caption text-neutral-400",
  cancelled: "text-caption font-caption text-neutral-400",
}

const PlanStepRow = ({ step }: { step: PlanStep }) => (
  <div className={`flex w-full items-start gap-2${step.status === "pending" ? " opacity-50" : ""}`}>
    {stepIcons[step.status]}
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
      <span className={stepTextStyles[step.status]}>{step.description}</span>
      {step.summary && (
        <span className="text-caption font-caption text-subtext-color">{step.summary}</span>
      )}
    </div>
  </div>
)

const PlanSectionLabel = ({ section }: { section: PlanSection }) => (
  <span className="text-caption-bold font-caption-bold text-subtext-color">
    {section.file}
    {section.totalInFile > 1 && <span className="text-neutral-400"> · {section.indexInFile} of {section.totalInFile}</span>}
  </span>
)

const findingToRows = (finding: Finding): React.ReactNode[] => [
  <div key={`d-${finding.direction}`} className="flex w-full items-start gap-2">
    <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5 flex-none" />
    <span className="text-caption font-caption text-default-font">{finding.direction}</span>
  </div>,
  <div key={`l-${finding.learned}`} className="flex w-full items-start gap-2">
    <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5 flex-none" />
    <span className="text-caption font-caption text-default-font">{finding.learned}</span>
  </div>,
]

const ExploreContainer = ({ orientation, aborted }: { orientation: DerivedOrientation; aborted: boolean }) => (
  <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 bg-neutral-50 pl-3 pr-2 py-2 my-1">
    <span className="text-caption-bold font-caption-bold text-default-font">
      {orientation.question}
    </span>
    {orientation.findings.flatMap(findingToRows)}
    {orientation.currentDirection && !aborted && (
      <div className="flex w-full items-start gap-2">
        <FeatherLoader2 className="text-caption font-caption text-brand-600 animate-spin mt-0.5 flex-none" />
        <span className="text-caption font-caption text-brand-700">{orientation.currentDirection}</span>
      </div>
    )}
    {aborted && <AbortBox />}
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
        <AssistantBubble>
          <MessageContent content={message.content} projectId={projectId} navigate={navigate} />
        </AssistantBubble>
      )
    case "orientation":
      return (
        <ExploreContainer
          orientation={message.orientation}
          aborted={message.aborted}
        />
      )
  }
}

const isPlanStep = (child: PlanChild): child is PlanStep => child.type === "plan-step"
const isPlanSection = (child: PlanChild): child is PlanSection => child.type === "plan-section"
const isPlanSectionGroup = (child: PlanChild): child is PlanSectionGroup => child.type === "plan-section-group"
const isLeafMessage = (child: PlanChild): child is LeafMessage =>
  child.type === "text" || child.type === "orientation"

const PlanLeafInline = ({ message, projectId, navigate }: { message: LeafMessage; projectId: string | null; navigate?: (url: string) => void }) => {
  if (message.type === "text" && message.role === "user") {
    return (
      <div className="flex w-full items-end justify-end">
        <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-3 py-1.5 shadow-sm max-w-[90%]">
          <div className="prose prose-sm text-caption font-caption text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
            <MessageContent content={message.content} projectId={projectId} navigate={navigate} />
          </div>
        </div>
      </div>
    )
  }
  if (message.type === "text") {
    return (
      <div className="flex w-full items-start">
        <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-3 py-1.5 max-w-[90%]">
          <div className="prose prose-sm text-caption font-caption text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0">
            <MessageContent content={message.content} projectId={projectId} navigate={navigate} />
          </div>
        </div>
      </div>
    )
  }
  return <LeafRenderer message={message} projectId={projectId} navigate={navigate} />
}

const SectionGroupRenderer = ({ group, bg, projectId, navigate }: { group: PlanSectionGroup; bg: string; projectId: string | null; navigate?: (url: string) => void }) => (
  <div className={`flex w-full flex-col items-start gap-1 ml-3 pl-3 py-1 rounded-md${bg ? ` ${bg}` : ""}${group.dimmed ? " opacity-50" : ""}`}>
    <PlanSectionLabel section={group.section} />
    {group.children.map((child, i) =>
      child.type === "plan-step"
        ? <PlanStepRow key={i} step={child} />
        : <PlanLeafInline key={i} message={child} projectId={projectId} navigate={navigate} />
    )}
  </div>
)

type PlanChildRendererProps = {
  child: PlanChild
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanChildRenderer = ({ child, projectId, navigate }: PlanChildRendererProps) => {
  if (isPlanStep(child)) return <PlanStepRow step={child} />
  if (isPlanSection(child)) return <PlanSectionLabel section={child} />
  if (isLeafMessage(child)) return <PlanLeafInline message={child} projectId={projectId} navigate={navigate} />
  return null
}

const StepProgressLabel = ({ progress }: { progress: { current: number; total: number } }) => (
  <span className="text-caption font-caption text-subtext-color">
    Step {progress.current} of {progress.total}
  </span>
)

const SectionProgressLabel = ({ progress }: { progress: SectionProgress }) => (
  <span className="text-caption font-caption text-subtext-color">
    {progress.completed} of {progress.total} sections
  </span>
)

const PlanHeaderRenderer = ({ header }: { header: PlanHeader }) => (
  <div className="flex w-full flex-col items-start gap-1 py-1">
    <span className="text-caption-bold font-caption-bold text-default-font">
      {header.task}
    </span>
    {header.stepProgress && !header.completed && (
      <StepProgressLabel progress={header.stepProgress} />
    )}
    {header.sectionProgress && !header.completed && (
      <SectionProgressLabel progress={header.sectionProgress} />
    )}
    {header.aborted && <AbortBox />}
  </div>
)

const PlanItemRenderer = ({ item, sectionBg, projectId, navigate }: { item: PlanItem; sectionBg: string; projectId: string | null; navigate?: (url: string) => void }) => {
  if (isPlanSectionGroup(item.child))
    return <SectionGroupRenderer group={item.child} bg={sectionBg} projectId={projectId} navigate={navigate} />
  return (
    <div className={`flex w-full flex-col items-start${item.section ? " ml-3" : ""}${item.dimmed ? " opacity-50" : ""}`}>
      <PlanChildRenderer child={item.child} projectId={projectId} navigate={navigate} />
    </div>
  )
}

const PlanRemainderRenderer = ({ remainder }: { remainder: PlanRemainder }) => (
  <div className="flex w-full items-start ml-3 pl-3 opacity-50">
    <span className="text-caption font-caption text-subtext-color">
      ...{remainder.count} more
    </span>
  </div>
)

type PlanMessage = PlanHeader | PlanItem | PlanRemainder

type PlanSegment = { type: "plan-segment"; items: PlanMessage[] }
type RenderSegment = LeafMessage | PlanSegment

const isPlanRelated = (m: GroupedMessage): m is PlanMessage =>
  m.type === "plan-header" || m.type === "plan-item" || m.type === "plan-remainder"

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

const computeSectionBgs = (items: PlanMessage[]): Map<number, string> => {
  const bgs = new Map<number, string>()
  let counter = 0
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type === "plan-item" && isPlanSectionGroup(item.child)) {
      bgs.set(i, counter % 2 === 0 ? "bg-neutral-50" : "")
      counter++
    }
  }
  return bgs
}

type PlanSegmentItemRendererProps = {
  item: PlanMessage
  sectionBg: string
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanSegmentItemRenderer = ({ item, sectionBg, projectId, navigate }: PlanSegmentItemRendererProps) => {
  switch (item.type) {
    case "plan-header":
      return <PlanHeaderRenderer header={item} />
    case "plan-item":
      return <PlanItemRenderer item={item} sectionBg={sectionBg} projectId={projectId} navigate={navigate} />
    case "plan-remainder":
      return <PlanRemainderRenderer remainder={item} />
  }
}

type PlanSegmentRendererProps = {
  items: PlanMessage[]
  active: boolean
  streamingText: string | null
  spinnerLabel: string | null
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanSegmentRenderer = ({ items, active, streamingText, spinnerLabel, projectId, navigate }: PlanSegmentRendererProps) => {
  const sectionBgs = computeSectionBgs(items)
  return (
    <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 pl-3 pr-2">
      {items.map((item, i) => (
        <PlanSegmentItemRenderer key={i} item={item} sectionBg={sectionBgs.get(i) ?? ""} projectId={projectId} navigate={navigate} />
      ))}
      {active && streamingText && (
        <PlanLeafInline message={{ type: "text", role: "assistant", content: streamingText }} projectId={projectId} navigate={navigate} />
      )}
      {active && spinnerLabel && <LoadingBubble label={spinnerLabel} />}
    </div>
  )
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
              projectId={null}
              navigate={navigate}
            />
          ) : (
            <LeafRenderer key={i} message={segment} projectId={null} navigate={navigate} />
          )
        )}
        {!activePlan && loading && streamingText && (
          <AssistantBubble>
            <MessageContent content={streamingText} projectId={null} navigate={navigate} />
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
