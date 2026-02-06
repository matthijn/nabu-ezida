"use client"

import { useState, useMemo } from "react"
import { FeatherX, FeatherChevronRight, FeatherChevronDown, FeatherAlertCircle, FeatherCopy, FeatherCheck } from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useDraggable } from "~/hooks/useDraggable"
import { useChat } from "~/lib/chat"
import { getToolDefinitions } from "~/lib/agent/executors"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { useObservationHistory } from "~/lib/agent/useObservationHistory"
import type { ObservationEntry } from "~/lib/agent/observation-store"
import type { Block, ToolCall } from "~/lib/agent"

type BlockRendererProps = {
  block: Block
}

const PREVIEW_LENGTH = 120

const preview = (s: string): string => {
  const truncated = s.slice(0, PREVIEW_LENGTH).replace(/\n/g, " ")
  return s.length > PREVIEW_LENGTH ? truncated + "..." : truncated
}

const formatToolCall = (call: ToolCall): string => {
  const args = Object.entries(call.args)
    .map(([k, v]) => {
      const str = typeof v === "string" ? v : JSON.stringify(v, null, 2)
      return `  ${k}: ${str}`
    })
    .join("\n")
  return `${call.name}\n${args}`
}

const formatResult = (result: unknown): string => {
  if (typeof result === "string") return result
  return JSON.stringify(result, null, 2)
}

const formatToolDefinitions = (): string =>
  JSON.stringify(getToolDefinitions(), null, 2)

const formatBlockSchemaDefinitions = (): string =>
  JSON.stringify(getBlockSchemaDefinitions(), null, 2)

const isErrorResult = (result: unknown): boolean =>
  typeof result === "object" && result !== null && "status" in result && (result.status === "error" || result.status === "partial")

const formatBlock = (block: Block): string => {
  switch (block.type) {
    case "user":
      return `[user]\n${block.content}`
    case "text":
      return `[assistant]\n${block.content}`
    case "reasoning":
      return `[thinking]\n${block.content}`
    case "tool_call":
      return `[tool_call]\n${block.calls.map(formatToolCall).join("\n\n")}`
    case "tool_result":
      return `[tool_result${block.toolName ? ` (${block.toolName})` : ""}]\n${formatResult(block.result)}`
    case "system":
      return `[system]\n${block.content}`
    case "empty_nudge":
      return `[empty_nudge]`
  }
}

const formatAllBlocks = (blocks: Block[]): string =>
  blocks.map(formatBlock).join("\n\n---\n\n")

type CollapsibleBlockProps = {
  label: string
  content: string
  borderColor: string
  labelColor: string
  bgColor?: string
  defaultExpanded?: boolean
  mono?: boolean
  icon?: React.ReactNode
}

const CollapsibleBlock = ({ label, content, borderColor, labelColor, bgColor, defaultExpanded = true, mono = false, icon }: CollapsibleBlockProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className={`border-l-2 ${borderColor} pl-2`}>
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 text-xs ${labelColor} font-medium hover:opacity-80`}
        >
          {expanded ? <FeatherChevronDown className="w-3 h-3" /> : <FeatherChevronRight className="w-3 h-3" />}
          {icon}
          {label}
        </button>
        <button onClick={handleCopy} className="text-neutral-400 hover:text-neutral-600 p-1">
          {copied ? <FeatherCheck className="w-3 h-3 text-green-500" /> : <FeatherCopy className="w-3 h-3" />}
        </button>
      </div>
      <div className={`text-sm whitespace-pre-wrap ${mono ? "font-mono" : ""} ${bgColor ?? ""} ${bgColor ? "p-2 rounded" : ""}`}>
        {expanded ? content : <span className="text-neutral-500">{preview(content)}</span>}
      </div>
    </div>
  )
}

const BlockRenderer = ({ block }: BlockRendererProps) => {
  switch (block.type) {
    case "user":
      return (
        <CollapsibleBlock
          label="user"
          content={block.content}
          borderColor="border-blue-400"
          labelColor="text-blue-600"
        />
      )
    case "text":
      return (
        <CollapsibleBlock
          label="assistant"
          content={block.content}
          borderColor="border-green-400"
          labelColor="text-green-600"
        />
      )
    case "tool_call":
      const toolContent = block.calls.map(formatToolCall).join("\n\n")
      return (
        <CollapsibleBlock
          label="tool_call"
          content={toolContent}
          borderColor="border-orange-400"
          labelColor="text-orange-600"
          bgColor="bg-orange-50"
          mono
        />
      )
    case "tool_result":
      const isError = isErrorResult(block.result)
      return (
        <CollapsibleBlock
          label={`tool_result${block.toolName ? ` (${block.toolName})` : ""}`}
          content={formatResult(block.result)}
          borderColor={isError ? "border-red-400" : "border-purple-400"}
          labelColor={isError ? "text-red-600" : "text-purple-600"}
          bgColor={isError ? "bg-red-50" : "bg-purple-50"}
          defaultExpanded={isError}
          mono
          icon={isError ? <FeatherAlertCircle className="w-3 h-3" /> : undefined}
        />
      )
    case "system":
      return (
        <CollapsibleBlock
          label="system"
          content={block.content}
          borderColor="border-gray-400"
          labelColor="text-gray-600"
          defaultExpanded={false}
        />
      )
    case "reasoning":
      return (
        <CollapsibleBlock
          label="thinking"
          content={block.content}
          borderColor="border-yellow-400"
          labelColor="text-yellow-600"
          bgColor="bg-yellow-50"
          defaultExpanded={true}
        />
      )
  }
}

type StreamingIndicatorProps = {
  streaming: string
  streamingToolArgs: string
  streamingReasoning: string
  streamingToolName: string | null
}

const StreamingIndicator = ({ streaming, streamingToolArgs, streamingReasoning, streamingToolName }: StreamingIndicatorProps) => {
  if (!streaming && !streamingToolName && !streamingReasoning) return null

  return (
    <>
      {streamingReasoning && (
        <div className="border-l-2 border-yellow-400 pl-2">
          <div className="text-xs text-yellow-600 font-medium mb-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            thinking
          </div>
          <div className="text-sm font-mono whitespace-pre-wrap bg-yellow-50 p-2 rounded">
            {streamingReasoning}
          </div>
        </div>
      )}
      {streamingToolName && (
        <div className="border-l-2 border-orange-400 pl-2">
          <div className="text-xs text-orange-600 font-medium mb-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
            tool_call: {streamingToolName}
          </div>
          {streamingToolArgs && (
            <div className="text-sm font-mono whitespace-pre-wrap bg-orange-50 p-2 rounded">
              {streamingToolArgs}
            </div>
          )}
        </div>
      )}
      {streaming && !streamingToolName && (
        <div className="border-l-2 border-green-400 pl-2">
          <div className="text-xs text-green-600 font-medium mb-1 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            assistant
          </div>
          <div className="text-sm whitespace-pre-wrap">{streaming}</div>
        </div>
      )}
    </>
  )
}

type DebugStreamPanelProps = {
  onClose: () => void
}

type TabButtonProps = {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  count?: number
  streaming?: boolean
}

const TabButton = ({ active, onClick, children, count, streaming }: TabButtonProps) => (
  <button
    onClick={onClick}
    className={`px-3 py-1 text-xs font-medium rounded-t transition-colors flex items-center gap-1 ${
      active
        ? "bg-white text-neutral-700 border-t border-l border-r border-neutral-300"
        : "bg-neutral-200 text-neutral-500 hover:text-neutral-700"
    }`}
  >
    {streaming && <span className="inline-block w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />}
    {children}
    {count !== undefined && (
      <span className="ml-1 px-1 bg-neutral-300 text-neutral-600 rounded text-[10px]">
        {count}
      </span>
    )}
  </button>
)

const CONVERSE_TAB = "converse"

const getUniqueCallerNames = (entries: ObservationEntry[]): string[] =>
  [...new Set(entries.map((e) => e.name))]

const filterByName = (entries: ObservationEntry[], name: string): ObservationEntry[] =>
  entries.filter((e) => e.name === name)

const countByName = (entries: ObservationEntry[], name: string): number =>
  entries.filter((e) => e.name === name).length

const isEntryStreaming = (entry: ObservationEntry): boolean =>
  (entry.streaming != null && entry.streaming !== "") ||
  (entry.streamingReasoning != null && entry.streamingReasoning !== "")

const hasStreamingEntry = (entries: ObservationEntry[], name: string): boolean =>
  entries.some((e) => e.name === name && isEntryStreaming(e))

type ObservationListProps = {
  entries: ObservationEntry[]
}

const ObservationList = ({ entries }: ObservationListProps) => (
  <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-3 px-3 py-3">
    {entries.length === 0 && (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-neutral-400">No calls yet</span>
      </div>
    )}
    {entries.map((entry) => (
      <div key={entry.id} className="border border-neutral-200 rounded-lg p-2 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-medium text-purple-600">
            {entry.name}
          </div>
          <div className="text-xs text-neutral-400">
            #{entry.id} · {new Date(entry.timestamp).toLocaleTimeString()}
          </div>
        </div>
        {entry.messages.map((block, i) => (
          <BlockRenderer key={`msg-${i}`} block={block} />
        ))}
        <div className="border-t border-neutral-200 pt-2">
          {entry.response.map((block, i) => (
            <BlockRenderer key={`res-${i}`} block={block} />
          ))}
          <StreamingIndicator
            streaming={entry.streaming ?? ""}
            streamingToolArgs=""
            streamingReasoning={entry.streamingReasoning ?? ""}
            streamingToolName={null}
          />
        </div>
      </div>
    ))}
  </AutoScroll>
)

export const DebugStreamPanel = ({ onClose }: DebugStreamPanelProps) => {
  const { position, handleMouseDown } = useDraggable({ x: 350, y: 16 })
  const { history, streaming, streamingToolArgs, streamingReasoning, streamingToolName } = useChat()
  const observationEntries = useObservationHistory()
  const [copiedAll, setCopiedAll] = useState(false)
  const [activeTab, setActiveTab] = useState(CONVERSE_TAB)

  const callerNames = useMemo(() => getUniqueCallerNames(observationEntries), [observationEntries])

  const handleCopyAll = () => {
    const tools = `[tools]\n${formatToolDefinitions()}`
    const schemas = `[block schemas]\n${formatBlockSchemaDefinitions()}`
    const blocks = formatAllBlocks(history)
    const content = [tools, schemas, blocks].filter(Boolean).join("\n\n---\n\n")
    navigator.clipboard.writeText(content)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  const isConverse = activeTab === CONVERSE_TAB
  const activeEntries = isConverse ? [] : filterByName(observationEntries, activeTab)

  return (
    <div
      style={{ right: position.x, bottom: position.y }}
      className="fixed z-50 flex h-[700px] w-[500px] flex-col rounded-lg border border-solid border-neutral-300 bg-white shadow-xl"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex w-full cursor-move items-center justify-between rounded-t-lg bg-neutral-100 px-4 py-2"
      >
        <span className="text-sm font-medium text-neutral-700">Debug Stream</span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleCopyAll}
            className="p-1 text-neutral-500 hover:text-neutral-700"
            title="Copy all messages"
          >
            {copiedAll ? <FeatherCheck className="w-4 h-4 text-green-500" /> : <FeatherCopy className="w-4 h-4" />}
          </button>
          <IconButton
            variant="neutral-tertiary"
            size="small"
            icon={<FeatherX />}
            onClick={onClose}
          />
        </div>
      </div>

      <div className="flex gap-1 px-3 pt-2 bg-neutral-100 border-b border-neutral-300 overflow-x-auto">
        <TabButton active={isConverse} onClick={() => setActiveTab(CONVERSE_TAB)} count={history.length}>
          Converse
        </TabButton>
        {callerNames.map((name) => (
          <TabButton key={name} active={activeTab === name} onClick={() => setActiveTab(name)} count={countByName(observationEntries, name)} streaming={hasStreamingEntry(observationEntries, name)}>
            {name}
          </TabButton>
        ))}
      </div>

      {isConverse && (
        <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-3 px-3 py-3">
          <CollapsibleBlock
            label="tools"
            content={formatToolDefinitions()}
            borderColor="border-cyan-400"
            labelColor="text-cyan-600"
            defaultExpanded={false}
            mono
          />
          <CollapsibleBlock
            label="block schemas"
            content={formatBlockSchemaDefinitions()}
            borderColor="border-cyan-400"
            labelColor="text-cyan-600"
            defaultExpanded={false}
            mono
          />
          {history.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <span className="text-sm text-neutral-400">No messages yet</span>
            </div>
          )}
          {history.map((block, i) => (
            <BlockRenderer key={i} block={block} />
          ))}
          <StreamingIndicator streaming={streaming} streamingToolArgs={streamingToolArgs} streamingReasoning={streamingReasoning} streamingToolName={streamingToolName} />
        </AutoScroll>
      )}

      {!isConverse && <ObservationList entries={activeEntries} />}
    </div>
  )
}
