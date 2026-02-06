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
import { derive } from "~/lib/agent"
import type { DerivedOrientation, Finding } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type LeafMessage, type PlanGroup, type PlanChild, type PlanStep, type PlanSection, type StepStatus } from "~/lib/chat/group"
import { getSpinnerLabel } from "~/lib/chat/spinnerLabel"
import { useFiles } from "~/hooks/useFiles"
import { filterCodeBlocks } from "~/lib/streaming/filter"
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
  completed: <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />,
  active: <FeatherCircle className="text-body font-body text-brand-600 mt-0.5 flex-none" />,
  pending: <FeatherCircle className="text-body font-body text-neutral-400 mt-0.5 flex-none" />,
  cancelled: <FeatherX className="text-body font-body text-neutral-400 mt-0.5 flex-none" />,
}

const stepTextStyles: Record<StepStatus, string> = {
  completed: "text-body font-body text-default-font",
  active: "text-body font-body text-default-font",
  pending: "text-body font-body text-neutral-400",
  cancelled: "text-body font-body text-neutral-400",
}

const PlanStepRow = ({ step }: { step: PlanStep }) => (
  <div className="flex w-full items-start gap-2">
    {stepIcons[step.status]}
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
      <span className={stepTextStyles[step.status]}>{step.description}</span>
      {step.summary && (
        <span className="text-body font-body text-subtext-color">{step.summary}</span>
      )}
    </div>
  </div>
)

const PlanSectionLabel = ({ section }: { section: PlanSection }) => (
  <span className="text-body-bold font-body-bold text-subtext-color">
    {section.file}
    {section.totalInFile > 1 && <span className="text-neutral-400"> · {section.indexInFile} of {section.totalInFile}</span>}
  </span>
)

const findingToRows = (finding: Finding): React.ReactNode[] => [
  <div key={`d-${finding.direction}`} className="flex w-full items-start gap-2">
    <FeatherArrowRight className="text-body font-body text-neutral-400 mt-0.5 flex-none" />
    <span className="text-body font-body text-default-font">{finding.direction}</span>
  </div>,
  <div key={`l-${finding.learned}`} className="flex w-full items-start gap-2">
    <FeatherLightbulb className="text-body font-body text-brand-600 mt-0.5 flex-none" />
    <span className="text-body font-body text-default-font">{finding.learned}</span>
  </div>,
]

const ExploreContainer = ({ orientation, aborted }: { orientation: DerivedOrientation; aborted: boolean }) => (
  <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 pl-3 pr-2 py-2 my-1">
    <span className="text-body-bold font-body-bold text-default-font">
      {orientation.question}
    </span>
    {orientation.findings.flatMap(findingToRows)}
    {orientation.currentDirection && !aborted && (
      <div className="flex w-full items-start gap-2">
        <FeatherLoader2 className="text-body font-body text-brand-600 animate-spin mt-0.5 flex-none" />
        <span className="text-body font-body text-brand-700">{orientation.currentDirection}</span>
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
const isLeafMessage = (child: PlanChild): child is LeafMessage =>
  child.type === "text" || child.type === "orientation"

type PlanChildRendererProps = {
  child: PlanChild
  projectId: string | null
  navigate?: (url: string) => void
  nested?: boolean
}

const PlanChildRenderer = ({ child, projectId, navigate, nested }: PlanChildRendererProps) => {
  if (isPlanStep(child)) return <PlanStepRow step={child} />
  if (isPlanSection(child)) return <PlanSectionLabel section={child} />
  if (isLeafMessage(child)) {
    if (child.type === "text" && child.role === "user") {
      return (
        <div className="flex w-full items-end justify-end">
          <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-3 py-1.5 shadow-sm max-w-[90%]">
            <span className="text-body font-body text-default-font">{child.content}</span>
          </div>
        </div>
      )
    }
    if (child.type === "text") {
      return (
        <div className="flex w-full items-start">
          <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-3 py-1.5 max-w-[90%]">
            <span className="text-body font-body text-default-font">{child.content}</span>
          </div>
        </div>
      )
    }
    return <LeafRenderer message={child} projectId={projectId} navigate={navigate} />
  }
  return null
}

const isSectionStart = (child: PlanChild): child is PlanSection => child.type === "plan-section"

type SectionBlockProps = {
  section: PlanSection
  children: PlanChild[]
  projectId: string | null
  navigate?: (url: string) => void
}

const SectionBlock = ({ section, children, projectId, navigate }: SectionBlockProps) => (
  <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 pl-3 py-1 ml-2">
    <PlanSectionLabel section={section} />
    {children.map((child, i) => (
      <PlanChildRenderer key={i} child={child} projectId={projectId} navigate={navigate} nested />
    ))}
  </div>
)

type PlanGroupRendererProps = {
  group: PlanGroup
  projectId: string | null
  navigate?: (url: string) => void
}

const groupSectionChildren = (children: PlanChild[]): { type: "section"; section: PlanSection; children: PlanChild[] }[] | null => {
  const firstSectionIdx = children.findIndex(isSectionStart)
  if (firstSectionIdx === -1) return null

  const sections: { type: "section"; section: PlanSection; children: PlanChild[] }[] = []
  let current: { section: PlanSection; children: PlanChild[] } | null = null

  for (let i = firstSectionIdx; i < children.length; i++) {
    const child = children[i]
    if (isSectionStart(child)) {
      if (current) sections.push({ type: "section", ...current })
      current = { section: child, children: [] }
    } else if (current) {
      const nextSection = children.slice(i + 1).findIndex(isSectionStart)
      const isStillInSection = isPlanStep(child) || isLeafMessage(child)
      if (isStillInSection) {
        current.children.push(child)
      } else {
        break
      }
    }
  }
  if (current) sections.push({ type: "section", ...current })
  return sections.length > 0 ? sections : null
}

const PlanGroupRenderer = ({ group, projectId, navigate }: PlanGroupRendererProps) => {
  const sectionGroups = groupSectionChildren(group.children)
  const firstSectionIdx = group.children.findIndex(isSectionStart)
  const lastSectionEndIdx = sectionGroups
    ? group.children.lastIndexOf(sectionGroups.at(-1)!.children.at(-1)!)
    : -1

  const before = firstSectionIdx === -1 ? group.children : group.children.slice(0, firstSectionIdx)
  const after = sectionGroups
    ? group.children.slice(lastSectionEndIdx + 1).filter((c) => !isSectionStart(c))
    : []

  return (
    <div className="flex w-full flex-col items-start gap-2 border-l-2 border-solid border-neutral-200 pl-3 pr-2 py-2 my-1">
      <span className="text-body-bold font-body-bold text-default-font">
        {group.task}
      </span>
      {before.map((child, i) => (
        <PlanChildRenderer key={`b-${i}`} child={child} projectId={projectId} navigate={navigate} />
      ))}
      {sectionGroups?.map((sg, i) => (
        <SectionBlock key={`s-${i}`} section={sg.section} projectId={projectId} navigate={navigate}>
          {sg.children}
        </SectionBlock>
      ))}
      {after.map((child, i) => (
        <PlanChildRenderer key={`a-${i}`} child={child} projectId={projectId} navigate={navigate} />
      ))}
      {group.aborted && <AbortBox />}
    </div>
  )
}

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

const getFirstLine = (text: string): string | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const firstLine = trimmed.split("\n")[0]
  return firstLine.replace(/^\*\*|\*\*$/g, "").trim() || null
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
  const messages = useMemo(() => toGroupedMessages(history, derived), [history, derived])

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
  const streamingText = streaming ? filterCodeBlocks(streaming) : null
  const reasoningLabel = getFirstLine(streamingReasoning)
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
        {messages.map((message, i) => (
          <GroupedMessageRenderer
            key={i}
            message={message}
            projectId={null}
            navigate={navigate}
          />
        ))}
        {loading && streamingText && (
          <AssistantBubble>
            <MessageContent content={streamingText} projectId={null} navigate={navigate} />
          </AssistantBubble>
        )}
        {spinnerLabel && <LoadingBubble label={spinnerLabel} />}
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
