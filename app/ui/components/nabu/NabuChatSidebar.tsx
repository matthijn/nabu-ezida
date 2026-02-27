"use client"

import { useState, useCallback, useEffect, useRef, useMemo, type KeyboardEvent, type ReactNode } from "react"
import { useNavigate, useParams } from "react-router"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FeatherBookmark,
  FeatherBookmarkCheck,
  FeatherCheck,
  FeatherChevronRight,
  FeatherCircle,
  FeatherEdit3,
  FeatherLoader2,
  FeatherMessageSquare,
  FeatherMinus,
  FeatherSend,
  FeatherSparkles,
  FeatherX,
} from "@subframe/core"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { Avatar } from "~/ui/components/Avatar"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { Tabs } from "~/ui/components/Tabs"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AnimatePresence } from "framer-motion"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { AnimatedListItem } from "~/ui/components/AnimatedListItem"
import { useChat } from "~/lib/chat"
import { derive } from "~/lib/agent"
import { toGroupedMessages, type GroupedMessage, type LeafMessage, type PlanHeader, type PlanItem, type PlanChild, type PlanStep, type StepStatus } from "~/lib/chat/group"
import type { AskMessage } from "~/lib/chat/messages"
import { isWaitingForAsk } from "~/lib/chat/messages"
import { getSpinnerLabel } from "~/lib/chat/spinnerLabel"
import { useFiles } from "~/hooks/useFiles"
import { preprocessStreaming } from "~/lib/streaming/filter"
import { AbortBox } from "~/ui/components/ai/StepsBlock"
import { useDraggable } from "~/hooks/useDraggable"
import { useResizable } from "~/hooks/useResizable"
import type { Participant } from "~/domain/participant"
import { createEntityLinkComponents } from "~/ui/components/markdown/createEntityLinkComponents"
import { linkifyEntityIds } from "~/domain/entity-link"
import { resolveEntityName } from "~/lib/files/selectors"
import { truncateLabel } from "~/lib/mutation-history"
import { InlineMarkdown } from "~/ui/components/InlineMarkdown"
import { isAnswerSaved, toggleAnswer } from "~/lib/chat/save-answer"
import { updateFileRaw, getFileRaw } from "~/lib/files"
import { PREFERENCES_FILE } from "~/lib/files/filename"
import { useNabu } from "./context"
import { HistoryTab } from "./HistoryTab"

type ChatTab = "chat" | "history"

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

const resolveAndTruncateName = (files: Record<string, string>, id: string): string | null => {
  const name = resolveEntityName(files, id)
  return name ? truncateLabel(name) : null
}

const remarkPlugins = [remarkGfm]

const ScrollableTable = ({ node, ...props }: React.ComponentProps<"table"> & { node?: unknown }) => (
  <div className="overflow-x-auto">
    <table {...props} />
  </div>
)

const MessageContent = ({ content, files, projectId, navigate }: MessageContentProps) => (
  <Markdown remarkPlugins={remarkPlugins} components={{ ...createEntityLinkComponents({ files, projectId, navigate }), table: ScrollableTable }} urlTransform={allowFileProtocol}>
    {fixMarkdownUrls(linkifyEntityIds(content, (id) => resolveAndTruncateName(files, id)))}
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
    <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-4 py-2 shadow-sm max-w-[95%]">
      <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-2 [&>*:last-child]:mb-0 [&_a]:text-brand-700 [&_a]:no-underline">
        {children}
      </div>
    </div>
  </div>
)

const AssistantBubble = ({ children }: { children: React.ReactNode }) => (
  <div className="flex w-full items-start">
    <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[95%]">
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

const displayContent = (message: LeafMessage): string | null =>
  message.draft ? preprocessStreaming(message.content) : message.content

type LeafRendererProps = {
  message: LeafMessage
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const LeafRenderer = ({ message, files, projectId, navigate }: LeafRendererProps) => {
  const content = displayContent(message)
  if (!content) return null
  if (message.role === "user") {
    return (
      <UserBubble>
        <MessageContent content={content} files={files} projectId={projectId} navigate={navigate} />
      </UserBubble>
    )
  }
  return (
    <AssistantBubble>
      <MessageContent content={content} files={files} projectId={projectId} navigate={navigate} />
    </AssistantBubble>
  )
}

type OptionCardProps = {
  children: ReactNode
  selected: boolean
  dimmed: boolean
  saved: boolean
  onClick?: () => void
  onToggleSave?: () => void
}

const SaveBadge = ({ saved, onToggle }: { saved: boolean; onToggle: () => void }) => (
  <button onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex-none cursor-pointer">
    {saved ? (
      <Badge variant="success" icon={<FeatherBookmarkCheck />}>Saved</Badge>
    ) : (
      <Badge variant="neutral" icon={<FeatherBookmark />}>Save</Badge>
    )}
  </button>
)

const OptionCard = ({ children, selected, dimmed, saved, onClick, onToggleSave }: OptionCardProps) => {
  const className = [
    "flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2",
    selected
      ? "border-brand-600 bg-brand-50"
      : dimmed
        ? "border-neutral-border bg-white opacity-50"
        : "border-neutral-border bg-white cursor-pointer hover:border-brand-600 hover:bg-brand-50 [&:hover_.option-icon]:hidden [&:hover_.option-check]:block",
  ].join(" ")

  const icon = selected
    ? <FeatherCheck className="text-brand-600 flex-none" />
    : <>
        <FeatherChevronRight className="option-icon text-neutral-400 flex-none" />
        <FeatherCheck className="option-check hidden text-brand-600 flex-none" />
      </>

  const text = <span className="grow text-left text-body font-body text-default-font pointer-events-none">{children}</span>

  if (selected) return (
    <div className={className}>
      {icon}
      {text}
      {onToggleSave && <SaveBadge saved={saved} onToggle={onToggleSave} />}
    </div>
  )

  return (
    <button onClick={onClick} disabled={dimmed} className={className}>
      {icon}
      {text}
    </button>
  )
}

type AskRendererProps = {
  message: AskMessage
  memoryContent: string | undefined
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
  onSelect: (option: string) => void
  onToggleSave: (question: string, answer: string) => void
}

const isTypedAnswer = (message: AskMessage): boolean =>
  message.selected !== null && !message.options.includes(message.selected)

const AskRenderer = ({ message, memoryContent, files, projectId, navigate, onSelect, onToggleSave }: AskRendererProps) => (
  <div className="flex w-full flex-col items-start gap-2 mb-3">
    <AssistantBubble><MessageContent content={message.question} files={files} projectId={projectId} navigate={navigate} /></AssistantBubble>
    <div className="flex w-full flex-col gap-1.5 max-w-[95%]">
      {message.options.map((option) => {
        const selected = message.selected === option
        return (
          <OptionCard
            key={option}
            selected={selected}
            dimmed={message.selected !== null && !selected}
            saved={selected && isAnswerSaved(memoryContent, message.question, option)}
            onClick={message.selected === null ? () => onSelect(option) : undefined}
            onToggleSave={selected ? () => onToggleSave(message.question, option) : undefined}
          >
            <InlineMarkdown files={files} projectId={projectId}>{option}</InlineMarkdown>
          </OptionCard>
        )
      })}
    </div>
    {isTypedAnswer(message) && <UserBubble><MessageContent content={message.selected!} files={files} projectId={projectId} navigate={navigate} /></UserBubble>}
  </div>
)

const isAskMessage = (m: GroupedMessage): m is AskMessage => m.type === "ask"

const isPlanStep = (child: PlanChild): child is PlanStep => child.type === "plan-step"
const isLeafMessage = (child: PlanChild): child is LeafMessage =>
  child.type === "text"

const PlanLeafInline = ({ message, files, projectId, navigate }: { message: LeafMessage; files: Record<string, string>; projectId: string | null; navigate?: (url: string) => void }) => {
  const content = displayContent(message)
  if (!content) return null
  if (message.role === "user") {
    return (
      <div className="flex w-full items-end justify-end">
        <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-3 py-1.5 shadow-sm max-w-[90%]">
          <div className="prose prose-sm text-caption font-caption text-default-font [&>*]:mb-0 [&_a]:no-underline">
            <MessageContent content={content} files={files} projectId={projectId} navigate={navigate} />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex w-full items-start mt-1">
      <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-3 py-1.5 max-w-[90%]">
        <div className="prose prose-sm text-caption font-caption text-default-font [&>*]:mb-0 [&_a]:no-underline">
          <MessageContent content={content} files={files} projectId={projectId} navigate={navigate} />
        </div>
      </div>
    </div>
  )
}

type PlanChildRendererProps = {
  child: PlanChild
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanChildRenderer = ({ child, files, projectId, navigate }: PlanChildRendererProps) => {
  if (isPlanStep(child)) return <PlanStepRow step={child} files={files} projectId={projectId} navigate={navigate} />
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

const PlanItemRenderer = ({ item, files, projectId, navigate }: { item: PlanItem; files: Record<string, string>; projectId: string | null; navigate?: (url: string) => void }) => (
  <div className={`flex w-full flex-col items-start${item.dimmed ? " opacity-50" : ""}`}>
    <PlanChildRenderer child={item.child} files={files} projectId={projectId} navigate={navigate} />
  </div>
)

type PlanMessage = PlanHeader | PlanItem

type PlanSegment = { type: "plan-segment"; items: PlanMessage[] }
type RenderSegment = LeafMessage | AskMessage | PlanSegment

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
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const PlanSegmentRenderer = ({ items, files, projectId, navigate }: PlanSegmentRendererProps) => (
    <div className="flex w-full flex-col items-start gap-2 border-l-2 border-solid border-neutral-200 pl-3 pr-2 py-2 my-1">
      {items.map((item, i) => (
        <PlanSegmentItemRenderer key={i} item={item} files={files} projectId={projectId} navigate={navigate} />
      ))}
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
  const { chat, send, respond, cancel, loading, draft, history } = useChat()
  const { files } = useFiles()

  const derived = useMemo(() => derive(history, files), [history, files])
  const isStreamingText = draft?.type === "text" && preprocessStreaming(draft.content) !== null
  const messages = useMemo(() => toGroupedMessages(history, derived), [history, derived])
  const segments = useMemo(() => toRenderSegments(messages), [messages])
  const waitingForAsk = useMemo(() => isWaitingForAsk(history), [history])

  const memoryContent = files[PREFERENCES_FILE]

  const handleToggleSave = useCallback((question: string, answer: string) => {
    const current = getFileRaw(PREFERENCES_FILE)
    updateFileRaw(PREFERENCES_FILE, toggleAnswer(current || undefined, question, answer))
  }, [])

  const [activeTab, setActiveTab] = useState<ChatTab>("chat")
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { position, isDragging, handleMouseDown } = useDraggable({ x: 16, y: 16 })
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
    if (waitingForAsk) {
      respond(inputValue.trim())
      setInputValue("")
      return
    }
    if (loading) return
    send(inputValue.trim(), getDeps())
    setInputValue("")
  }, [loading, waitingForAsk, inputValue, send, respond, getDeps])

  const markTyping = useCallback(() => {
    setIsTyping(true)
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current)
    typingTimerRef.current = setTimeout(() => setIsTyping(false), 300)
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      markTyping()
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend, markTyping]
  )

  const handleMinimize = useCallback(() => {
    minimizeChat()
  }, [minimizeChat])

  const showFloatingButton = !chat || minimized
  if (showFloatingButton) return <NabuFloatingButton hasChat={!!chat} />

  const { recipient } = chat
  const spinnerLabel = loading && !isStreamingText ? getSpinnerLabel(history, draft) : null

  return (
    <div
      style={{ right: position.x, bottom: position.y, width: size.width, height: size.height }}
      className="fixed z-50 flex flex-col rounded-xl border border-solid border-neutral-border bg-white shadow-lg overflow-hidden"
    >
      <div
        onMouseDown={handleResizeMouseDown}
        className="absolute -left-1 -top-1 z-10 h-4 w-4 cursor-nwse-resize"
      />
      <div className="flex w-full flex-col items-start border-b border-solid border-neutral-border bg-white">
        <div
          onMouseDown={handleMouseDown}
          className="flex w-full cursor-move items-center justify-between px-4 py-3"
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
        <div className="flex w-full items-start px-4">
          <Tabs>
            <Tabs.Item active={activeTab === "chat"} icon={<FeatherMessageSquare />} onClick={() => setActiveTab("chat")}>
              Chat
            </Tabs.Item>
            <Tabs.Item active={activeTab === "history"} icon={<FeatherEdit3 />} onClick={() => setActiveTab("history")}>
              History
            </Tabs.Item>
          </Tabs>
        </div>
      </div>

      {activeTab === "history" ? (
        <HistoryTab files={files} projectId={params.projectId ?? null} navigate={navigate} />
      ) : (
        <>
          <AutoScroll className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-2 px-4 py-4 overflow-auto">
            {messages.length === 0 && !loading && (
              <div className="flex h-full w-full items-center justify-center">
                <span className="text-body font-body text-subtext-color">How can I help you today?</span>
              </div>
            )}
            <AnimatePresence initial={false}>
              {/* DO NOT TOUCH — layout animation is intentional and tuned. Do not remove, refactor, or "fix". */}
              {segments.map((segment, i) =>
                <AnimatedListItem key={i} layout={isDragging || isTyping ? false : "position"}>
                  {isPlanSegment(segment) ? (
                    <PlanSegmentRenderer
                      items={segment.items}
                      files={files}
                      projectId={params.projectId ?? null}
                      navigate={navigate}
                    />
                  ) : isAskMessage(segment) ? (
                    <AskRenderer message={segment} memoryContent={memoryContent} files={files} projectId={params.projectId ?? null} navigate={navigate} onSelect={respond} onToggleSave={handleToggleSave} />
                  ) : (
                    <LeafRenderer message={segment} files={files} projectId={params.projectId ?? null} navigate={navigate} />
                  )}
                </AnimatedListItem>
              )}
            </AnimatePresence>
            {!waitingForAsk && spinnerLabel && <LoadingBubble label={spinnerLabel} />}
          </AutoScroll>

          <div className={`flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3 ${loading && !waitingForAsk ? "bg-neutral-50" : ""}`}>
            <TextFieldUnstyled className="grow min-h-5">
              <TextFieldUnstyled.Textarea
                ref={inputRef}
                placeholder={waitingForAsk ? "Or type your own answer..." : `Message ${recipient.name}...`}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </TextFieldUnstyled>
            {loading && !waitingForAsk ? (
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
        </>
      )}
    </div>
  )
}
