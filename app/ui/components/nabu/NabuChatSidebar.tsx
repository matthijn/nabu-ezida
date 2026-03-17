"use client"

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import { useNavigate, useParams } from "react-router"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  FeatherBookOpen,
  FeatherCheck,
  FeatherChevronRight,
  FeatherCircle,
  FeatherLoader2,
  FeatherMessageCircle,
  FeatherMessageSquare,
  FeatherSend,
  FeatherSlidersHorizontal,
  FeatherSparkles,
  FeatherX,
} from "@subframe/core"
import { Button } from "~/ui/components/Button"
import { IconButton } from "~/ui/components/IconButton"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { AnimatePresence } from "framer-motion"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { AnimatedListItem } from "~/ui/components/AnimatedListItem"
import { useChat } from "~/lib/chat"
import { derive } from "~/lib/agent"
import { pushBlocks } from "~/lib/agent/block-store"
import {
  toGroupedMessages,
  type GroupedMessage,
  type LeafMessage,
  type PlanHeader,
  type PlanItem,
  type PlanChild,
  type PlanStep,
  type StepStatus,
} from "~/lib/chat/group"
import type { AskMessage, AskScope } from "~/lib/chat/messages"
import { isWaitingForAsk } from "~/lib/chat/messages"
import { getSpinnerLabel } from "~/lib/chat/spinnerLabel"
import { useFiles } from "~/hooks/useFiles"
import { preprocessStreaming } from "~/lib/streaming/filter"
import { AbortBox } from "~/ui/components/ai/StepsBlock"
import { createEntityLinkComponents } from "~/ui/components/markdown/createEntityLinkComponents"
import {
  linkifyEntityIds,
  linkifyTags,
  linkifyQuotes,
  normalizeBacktickQuotes,
} from "~/domain/entity-link"
import { findTagDefinitionByLabel } from "~/domain/blocks/settings/tags/selectors"
import { resolveEntityName } from "~/lib/files/selectors"
import { truncateLabel, useMutationHistory, presentEntry } from "~/lib/mutation-history"
import type { HistoryEntry } from "~/lib/mutation-history"
import { boldMissingFile } from "~/lib/files/filename"
import { InlineMarkdown } from "~/ui/components/InlineMarkdown"
import { useNabu } from "./context"
import { pickGreeting } from "~/lib/chat/greetings"

const encodeUrlForMarkdown = (url: string): string => url.replace(/"/g, "%22")

const fixMarkdownUrls = (content: string): string =>
  content.replace(/\]\(([^)<>]+)\)/g, (_, url: string) => `](<${encodeUrlForMarkdown(url)}>)`)

const allowFileProtocol = (url: string): string => url

interface MessageContentProps {
  content: string
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

const resolveAndTruncateName = (files: Record<string, string>, id: string): string | null => {
  const name = resolveEntityName(files, id)
  return name ? truncateLabel(name) : null
}

const resolveTagForLinkify = (
  files: Record<string, string>,
  label: string
): { id: string; display: string } | null => {
  const def = findTagDefinitionByLabel(files, label)
  return def ? { id: def.id, display: def.display } : null
}

const remarkPlugins = [remarkGfm]

const ScrollableTable = ({
  _node,
  ...props
}: React.ComponentProps<"table"> & { _node?: unknown }) => (
  <div className="overflow-x-auto">
    <table {...props} />
  </div>
)

const MessageContent = ({
  content,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: MessageContentProps) => (
  <Markdown
    remarkPlugins={remarkPlugins}
    components={{
      ...createEntityLinkComponents({ files, projectId, navigate }),
      table: ScrollableTable,
    }}
    urlTransform={allowFileProtocol}
  >
    {fixMarkdownUrls(
      linkifyTags(
        linkifyEntityIds(
          linkifyQuotes(normalizeBacktickQuotes(content), currentFile, currentFileContent),
          (id) => resolveAndTruncateName(files, id),
          boldMissingFile
        ),
        (label) => resolveTagForLinkify(files, label)
      )
    )}
  </Markdown>
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

interface PlanStepRowProps {
  step: PlanStep
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

const PlanStepRow = ({
  step,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: PlanStepRowProps) => {
  const Icon = step.checkpoint ? FeatherMessageSquare : stepIconComponent[step.status]
  return (
    <div className="flex w-full items-start gap-2">
      <Icon className={`text-body ${stepIconColor[step.status]} mt-0.5 flex-none`} />
      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
        <div
          className={`prose prose-sm [&>*]:mb-0 [&_a]:no-underline text-body font-body ${stepTextColor[step.status]}`}
        >
          <MessageContent
            content={step.description}
            files={files}
            projectId={projectId}
            currentFile={currentFile}
            currentFileContent={currentFileContent}
            navigate={navigate}
          />
        </div>
        {step.summary && (
          <div className="prose prose-sm [&>*]:mb-0 [&_a]:no-underline text-caption font-caption text-subtext-color">
            <MessageContent
              content={step.summary}
              files={files}
              projectId={projectId}
              currentFile={currentFile}
              currentFileContent={currentFileContent}
              navigate={navigate}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const displayContent = (message: LeafMessage): string | null =>
  message.draft ? preprocessStreaming(message.content) : message.content

interface LeafRendererProps {
  message: LeafMessage
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

const LeafRenderer = ({
  message,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: LeafRendererProps) => {
  const content = displayContent(message)
  if (!content) return null
  if (message.role === "user") {
    return (
      <UserBubble>
        <MessageContent
          content={content}
          files={files}
          projectId={projectId}
          currentFile={currentFile}
          currentFileContent={currentFileContent}
          navigate={navigate}
        />
      </UserBubble>
    )
  }
  return (
    <AssistantBubble>
      <MessageContent
        content={content}
        files={files}
        projectId={projectId}
        currentFile={currentFile}
        currentFileContent={currentFileContent}
        navigate={navigate}
      />
    </AssistantBubble>
  )
}

interface OptionCardProps {
  children: ReactNode
  selected: boolean
  dimmed: boolean
  onClick?: () => void
}

const OptionCard = ({ children, selected, dimmed, onClick }: OptionCardProps) => {
  const className = [
    "flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2",
    selected
      ? "border-brand-600 bg-brand-50"
      : dimmed
        ? "border-neutral-border bg-white opacity-50"
        : "border-neutral-border bg-white cursor-pointer hover:border-brand-600 hover:bg-brand-50 [&:hover_.option-icon]:hidden [&:hover_.option-check]:block",
  ].join(" ")

  const icon = selected ? (
    <FeatherCheck className="text-brand-600 flex-none" />
  ) : (
    <>
      <FeatherChevronRight className="option-icon text-neutral-400 flex-none" />
      <FeatherCheck className="option-check hidden text-brand-600 flex-none" />
    </>
  )

  const text = (
    <span className="grow text-left text-body font-body text-default-font pointer-events-none">
      {children}
    </span>
  )

  if (selected)
    return (
      <div className={className}>
        {icon}
        {text}
      </div>
    )

  return (
    <button onClick={onClick} disabled={dimmed} className={className}>
      {icon}
      {text}
    </button>
  )
}

interface AskRendererProps {
  message: AskMessage
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
  onSelect: (option: string) => void
}

const isTypedAnswer = (message: AskMessage): boolean =>
  message.selected !== null && !message.options.includes(message.selected)

const scopeIcon: Record<AskScope, React.ComponentType<{ className?: string }>> = {
  local: FeatherMessageCircle,
  codebook: FeatherBookOpen,
  preferences: FeatherSlidersHorizontal,
}

const scopeLabel: Record<AskScope, string> = {
  local: "This conversation",
  codebook: "Codebook",
  preferences: "Preferences",
}

const ScopeBadge = ({ scope }: { scope: AskScope }) => {
  const Icon = scopeIcon[scope]
  return (
    <span className="flex items-center gap-1 text-caption font-caption text-subtext-color">
      <Icon className="w-3 h-3" />
      <span>{scopeLabel[scope]}</span>
    </span>
  )
}

const hasOptions = (message: AskMessage): boolean => message.options.length > 0

const AskRenderer = ({
  message,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
  onSelect,
}: AskRendererProps) => (
  <div className="flex w-full flex-col items-start gap-2 mb-3">
    <AssistantBubble>
      <MessageContent
        content={message.question}
        files={files}
        projectId={projectId}
        currentFile={currentFile}
        currentFileContent={currentFileContent}
        navigate={navigate}
      />
    </AssistantBubble>
    {hasOptions(message) && (
      <div className="flex w-full flex-col gap-1.5 max-w-[95%]">
        {message.options.map((option) => {
          const selected = message.selected === option
          return (
            <OptionCard
              key={option}
              selected={selected}
              dimmed={message.selected !== null && !selected}
              onClick={message.selected === null ? () => onSelect(option) : undefined}
            >
              <InlineMarkdown
                files={files}
                projectId={projectId}
                currentFile={currentFile}
                currentFileContent={currentFileContent}
              >
                {option}
              </InlineMarkdown>
            </OptionCard>
          )
        })}
      </div>
    )}
    {isTypedAnswer(message) && (
      <UserBubble>
        <MessageContent
          content={message.selected ?? ""}
          files={files}
          projectId={projectId}
          currentFile={currentFile}
          currentFileContent={currentFileContent}
          navigate={navigate}
        />
      </UserBubble>
    )}
    <ScopeBadge scope={message.scope} />
  </div>
)

const isPlanStep = (child: PlanChild): child is PlanStep => child.type === "plan-step"
const isLeafMessage = (child: PlanChild): child is LeafMessage => child.type === "text"

const PlanLeafInline = ({
  message,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: {
  message: LeafMessage
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}) => {
  const content = displayContent(message)
  if (!content) return null
  if (message.role === "user") {
    return (
      <div className="flex w-full items-end justify-end">
        <div className="flex flex-col items-start rounded-2xl bg-brand-200 px-3 py-1.5 shadow-sm max-w-[90%]">
          <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-0 [&_a]:no-underline">
            <MessageContent
              content={content}
              files={files}
              projectId={projectId}
              currentFile={currentFile}
              currentFileContent={currentFileContent}
              navigate={navigate}
            />
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="flex w-full items-start mt-1">
      <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-3 py-1.5 max-w-[90%]">
        <div className="prose prose-sm text-body font-body text-default-font [&>*]:mb-0 [&_a]:no-underline">
          <MessageContent
            content={content}
            files={files}
            projectId={projectId}
            currentFile={currentFile}
            currentFileContent={currentFileContent}
            navigate={navigate}
          />
        </div>
      </div>
    </div>
  )
}

interface PlanChildRendererProps {
  child: PlanChild
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

const PlanChildRenderer = ({
  child,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: PlanChildRendererProps) => {
  if (isPlanStep(child))
    return (
      <PlanStepRow
        step={child}
        files={files}
        projectId={projectId}
        currentFile={currentFile}
        currentFileContent={currentFileContent}
        navigate={navigate}
      />
    )
  if (isLeafMessage(child))
    return (
      <PlanLeafInline
        message={child}
        files={files}
        projectId={projectId}
        currentFile={currentFile}
        currentFileContent={currentFileContent}
        navigate={navigate}
      />
    )
  return null
}

interface PlanHeaderRendererProps {
  header: PlanHeader
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

const PlanHeaderRenderer = ({
  header,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: PlanHeaderRendererProps) => (
  <div className="flex w-full flex-col items-start gap-1 py-1">
    <div className="prose prose-sm [&>*]:mb-0 [&_a]:no-underline text-body-bold font-body-bold text-default-font">
      <MessageContent
        content={header.task}
        files={files}
        projectId={projectId}
        currentFile={currentFile}
        currentFileContent={currentFileContent}
        navigate={navigate}
      />
    </div>
    {header.aborted && <AbortBox />}
  </div>
)

const PlanItemRenderer = ({
  item,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: {
  item: PlanItem
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}) => (
  <div className={`flex w-full flex-col items-start${item.dimmed ? " opacity-50" : ""}`}>
    <PlanChildRenderer
      child={item.child}
      files={files}
      projectId={projectId}
      currentFile={currentFile}
      currentFileContent={currentFileContent}
      navigate={navigate}
    />
  </div>
)

type PlanMessage = PlanHeader | PlanItem

interface PlanSegment {
  type: "plan-segment"
  items: PlanMessage[]
}
interface CollapsedSteps {
  type: "collapsed-steps"
  count: number
}
type RenderSegment = LeafMessage | AskMessage | PlanSegment
type FinalSegment = RenderSegment | CollapsedSteps

const isPlanRelated = (m: GroupedMessage): m is PlanMessage =>
  m.type === "plan-header" || m.type === "plan-item"

const isPlanSegment = (s: FinalSegment): s is PlanSegment => s.type === "plan-segment"

const isAskSegment = (s: FinalSegment): s is AskMessage => s.type === "ask"

const isCollapsedSteps = (s: FinalSegment): s is CollapsedSteps => s.type === "collapsed-steps"

const toRenderSegments = (messages: GroupedMessage[]): RenderSegment[] =>
  messages.reduce<RenderSegment[]>((acc, m) => {
    if (!isPlanRelated(m)) return [...acc, m]
    const prev = acc[acc.length - 1]
    if (prev && isPlanSegment(prev)) {
      return [...acc.slice(0, -1), { type: "plan-segment", items: [...prev.items, m] }]
    }
    return [...acc, { type: "plan-segment", items: [m] }]
  }, [])

const countPlanSteps = (items: PlanMessage[]): number =>
  items.filter((item) => item.type === "plan-item" && isPlanStep(item.child)).length

const findLastAskIndex = (segments: RenderSegment[]): number => {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (isAskSegment(segments[i])) return i
  }
  return -1
}

const collapseAfterPendingAsk = (segments: RenderSegment[], waiting: boolean): FinalSegment[] => {
  if (!waiting) return segments
  const lastAskIdx = findLastAskIndex(segments)
  if (lastAskIdx === -1) return segments
  const after = segments.slice(lastAskIdx + 1)
  const count = after.reduce(
    (sum: number, s) => (isPlanSegment(s) ? sum + countPlanSteps(s.items) : sum),
    0
  )
  if (count === 0) return segments
  return [...segments.slice(0, lastAskIdx + 1), { type: "collapsed-steps", count }]
}

interface PlanSegmentItemRendererProps {
  item: PlanMessage
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

const PlanSegmentItemRenderer = ({
  item,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: PlanSegmentItemRendererProps) => {
  switch (item.type) {
    case "plan-header":
      return (
        <PlanHeaderRenderer
          header={item}
          files={files}
          projectId={projectId}
          currentFile={currentFile}
          currentFileContent={currentFileContent}
          navigate={navigate}
        />
      )
    case "plan-item":
      return (
        <PlanItemRenderer
          item={item}
          files={files}
          projectId={projectId}
          currentFile={currentFile}
          currentFileContent={currentFileContent}
          navigate={navigate}
        />
      )
  }
}

const CollapsedStepsIndicator = ({ count }: { count: number }) => (
  <span className="text-caption font-caption text-subtext-color">
    Waiting for your input — {count} step{count !== 1 ? "s" : ""} remaining
  </span>
)

const isPendingPlanStep = (item: PlanMessage): boolean =>
  item.type === "plan-item" && isPlanStep(item.child) && item.child.status === "pending"

const hasInlineLeaf = (items: PlanMessage[]): boolean =>
  items.some((item) => item.type === "plan-item" && isLeafMessage(item.child))

interface TrailingSplit {
  visible: PlanMessage[]
  pendingCount: number
}

const splitTrailingPending = (items: PlanMessage[], loading: boolean): TrailingSplit => {
  if (loading || !hasInlineLeaf(items)) return { visible: items, pendingCount: 0 }
  let splitIdx = items.length
  for (let i = items.length - 1; i >= 0; i--) {
    if (!isPendingPlanStep(items[i])) break
    splitIdx = i
  }
  return { visible: items.slice(0, splitIdx), pendingCount: items.length - splitIdx }
}

interface PlanSegmentRendererProps {
  items: PlanMessage[]
  loading: boolean
  files: Record<string, string>
  projectId: string | null
  currentFile: string | null
  currentFileContent: string | null
  navigate?: (url: string) => void
}

type SegmentRun = { type: "single"; item: PlanMessage } | { type: "nested"; items: PlanMessage[] }

const isNestedPlanItem = (item: PlanMessage): boolean =>
  item.type === "plan-item" && item.child.type === "plan-step" && item.child.nested

const groupIntoRuns = (items: PlanMessage[]): SegmentRun[] =>
  items.reduce<SegmentRun[]>((acc, item) => {
    if (!isNestedPlanItem(item)) return [...acc, { type: "single", item }]
    const prev = acc[acc.length - 1]
    if (prev && prev.type === "nested") {
      return [...acc.slice(0, -1), { type: "nested", items: [...prev.items, item] }]
    }
    return [...acc, { type: "nested", items: [item] }]
  }, [])

const PlanSegmentRenderer = ({
  items,
  loading,
  files,
  projectId,
  currentFile,
  currentFileContent,
  navigate,
}: PlanSegmentRendererProps) => {
  const { visible, pendingCount } = splitTrailingPending(items, loading)
  const runs = groupIntoRuns(visible)
  return (
    <div className="flex w-full flex-col items-start gap-2 border-l-2 border-solid border-neutral-200 pl-3 pr-2 py-2 my-1">
      {runs.map((run, i) =>
        run.type === "single" ? (
          <PlanSegmentItemRenderer
            key={i}
            item={run.item}
            files={files}
            projectId={projectId}
            currentFile={currentFile}
            currentFileContent={currentFileContent}
            navigate={navigate}
          />
        ) : (
          <div
            key={i}
            className="flex w-full flex-col items-start gap-2 border-l-2 border-solid border-neutral-200 pl-3"
          >
            {run.items.map((item, j) => (
              <PlanSegmentItemRenderer
                key={j}
                item={item}
                files={files}
                projectId={projectId}
                currentFile={currentFile}
                currentFileContent={currentFileContent}
                navigate={navigate}
              />
            ))}
          </div>
        )
      )}
      {pendingCount > 0 && <CollapsedStepsIndicator count={pendingCount} />}
    </div>
  )
}

const EmptyState = ({ onStart }: { onStart: () => void }) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3">
    <IconWithBackground variant="brand" size="medium" icon={<FeatherSparkles />} />
    <span className="text-body font-body text-subtext-color">How can I help you today?</span>
    <Button variant="brand-primary" icon={<FeatherSparkles />} onClick={onStart}>
      Start chat
    </Button>
  </div>
)

interface LoadingBubbleProps {
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

const findLastWriteEntry = (entries: HistoryEntry[]): HistoryEntry | null =>
  entries.length > 0 ? entries[entries.length - 1] : null

const formatLastWriteLabel = (entry: HistoryEntry, currentFile: string | null): string => {
  const { verbLabel, subtitle } = presentEntry(entry)
  const isCurrentFile = entry.path === currentFile
  return isCurrentFile ? `${verbLabel} in current file` : `${verbLabel} in ${subtitle}`
}

interface LastWriteBarProps {
  entry: HistoryEntry
  currentFile: string | null
  onClick: () => void
}

const LastWriteBar = ({ entry, currentFile, onClick }: LastWriteBarProps) => {
  const { icon: Icon } = presentEntry(entry)
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 bg-brand-100 px-4 py-1.5 text-left hover:bg-brand-200 transition-colors"
    >
      <Icon className="text-brand-500 w-3.5 h-3.5 flex-none" />
      <span className="text-caption font-caption text-brand-700 truncate">
        {formatLastWriteLabel(entry, currentFile)}
      </span>
    </button>
  )
}

export const NabuChatSidebar = () => {
  const { startChat } = useNabu()
  const navigate = useNavigate()
  const params = useParams<{ projectId: string }>()

  const getDeps = useCallback(() => {
    const project = params.projectId ? { id: params.projectId } : undefined
    return { project, navigate }
  }, [navigate, params.projectId])
  const { chat, send, respond, cancel, loading, draft, history } = useChat()
  const mutationHistory = useMutationHistory()
  const lastEntry = useMemo(() => findLastWriteEntry(mutationHistory), [mutationHistory])
  const { files, currentFile } = useFiles()
  const currentFileContent = currentFile ? (files[currentFile] ?? null) : null

  const derived = useMemo(() => derive(history, files), [history, files])
  const isStreamingText = draft?.type === "text" && preprocessStreaming(draft.content) !== null
  const messages = useMemo(() => toGroupedMessages(history, derived), [history, derived])
  const rawSegments = useMemo(() => toRenderSegments(messages), [messages])
  const waitingForInput = useMemo(() => isWaitingForAsk(history), [history])
  const segments = useMemo(
    () => collapseAfterPendingAsk(rawSegments, waitingForInput),
    [rawSegments, waitingForInput]
  )

  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const typingTimerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (chat) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [chat])

  const didAutoSend = useRef(false)
  useEffect(() => {
    if (chat && history.length === 0 && !didAutoSend.current) {
      didAutoSend.current = true
      send(pickGreeting(), getDeps())
      pushBlocks([
        {
          type: "system",
          content: `IMPORTANT: The message above is an AUTO-GENERATED greeting sent on page load. The user did NOT type this. It is NOT a request or instruction. Do NOT use tools, read files, make plans, or take any action. Reply with a short, warm, casual greeting (1-2 sentences max) that matches the vibe and tone of the user's message, and nothing else. Current time: ${new Date().toLocaleString()}.`,
        },
      ])
    }
  }, [chat, history.length, send, getDeps])

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return
    if (waitingForInput) {
      respond(inputValue.trim())
      setInputValue("")
      return
    }
    if (loading) return
    send(inputValue.trim(), getDeps())
    setInputValue("")
  }, [loading, waitingForInput, inputValue, send, respond, getDeps])

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

  const navigateToFile = useCallback(
    (path: string) => {
      if (!params.projectId) return
      navigate(`/project/${params.projectId}/file/${encodeURIComponent(path)}`)
    },
    [navigate, params.projectId]
  )

  if (!chat) {
    return (
      <div className="flex w-full grow flex-col rounded-xl bg-default-background overflow-hidden">
        <EmptyState onStart={startChat} />
      </div>
    )
  }

  const { recipient } = chat
  const spinnerLabel = loading && !isStreamingText ? getSpinnerLabel(history, draft) : null

  return (
    <div className="flex w-full grow flex-col rounded-xl bg-white overflow-hidden">
      <AutoScroll className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-2 px-4 py-4 overflow-auto">
        {messages.length === 0 && !loading && (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-body font-body text-subtext-color">
              How can I help you today?
            </span>
          </div>
        )}
        <AnimatePresence initial={false}>
          {segments.map((segment, i) => (
            <AnimatedListItem key={i} layout={isTyping ? false : "position"}>
              {isPlanSegment(segment) ? (
                <PlanSegmentRenderer
                  items={segment.items}
                  loading={loading}
                  files={files}
                  projectId={params.projectId ?? null}
                  currentFile={currentFile}
                  currentFileContent={currentFileContent}
                  navigate={navigate}
                />
              ) : isAskSegment(segment) ? (
                <AskRenderer
                  message={segment}
                  files={files}
                  projectId={params.projectId ?? null}
                  currentFile={currentFile}
                  currentFileContent={currentFileContent}
                  navigate={navigate}
                  onSelect={respond}
                />
              ) : isCollapsedSteps(segment) ? (
                <CollapsedStepsIndicator count={segment.count} />
              ) : (
                <LeafRenderer
                  message={segment}
                  files={files}
                  projectId={params.projectId ?? null}
                  currentFile={currentFile}
                  currentFileContent={currentFileContent}
                  navigate={navigate}
                />
              )}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
        {!waitingForInput && spinnerLabel && <LoadingBubble label={spinnerLabel} />}
      </AutoScroll>

      {lastEntry && (
        <LastWriteBar
          entry={lastEntry}
          currentFile={currentFile}
          onClick={() => navigateToFile(lastEntry.path)}
        />
      )}

      <div
        className={`flex w-full items-end gap-2 border-t border-solid border-neutral-border px-4 py-3 ${loading && !waitingForInput ? "bg-neutral-50" : ""}`}
      >
        <TextFieldUnstyled className="grow min-h-5">
          <TextFieldUnstyled.Textarea
            ref={inputRef}
            placeholder={
              waitingForInput ? "Or type your own answer..." : `Message ${recipient.name}...`
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </TextFieldUnstyled>
        {loading && !waitingForInput ? (
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
