"use client"

import { useState } from "react"
import { useSyncExternalStore } from "react"
import { FeatherX, FeatherChevronRight, FeatherChevronDown, FeatherAlertCircle, FeatherCopy, FeatherCheck } from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useDraggable } from "~/hooks/useDraggable"
import { useChat } from "~/lib/chat"
import { getToolDefinitions } from "~/lib/agent/executors"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { getAllBlocks, subscribeBlocks, type TaggedBlock } from "~/lib/agent/block-store"
import type { Block, ToolCall } from "~/lib/agent"

type BlockRendererProps = {
  block: TaggedBlock
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
  suffix?: React.ReactNode
}

const CollapsibleBlock = ({ label, content, borderColor, labelColor, bgColor, defaultExpanded = true, mono = false, icon, suffix }: CollapsibleBlockProps) => {
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
          {suffix}
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

const OriginBadge = ({ origin }: { origin: TaggedBlock["origin"] }) => (
  <span className="text-xs text-neutral-600 font-mono bg-neutral-100 px-1.5 py-0.5 rounded ml-2">
    {origin.agent} #{origin.instance.split("-").pop()}
  </span>
)

const BlockRenderer = ({ block }: BlockRendererProps) => {
  const badge = <OriginBadge origin={block.origin} />

  switch (block.type) {
    case "user":
      return (
        <CollapsibleBlock
          label="user"
          content={block.content}
          borderColor="border-blue-400"
          labelColor="text-blue-600"
          suffix={badge}
        />
      )
    case "text":
      return (
        <CollapsibleBlock
          label="assistant"
          content={block.content}
          borderColor="border-green-400"
          labelColor="text-green-600"
          suffix={badge}
        />
      )
    case "tool_call":
      return (
        <CollapsibleBlock
          label="tool_call"
          content={block.calls.map(formatToolCall).join("\n\n")}
          borderColor="border-orange-400"
          labelColor="text-orange-600"
          bgColor="bg-orange-50"
          mono
          suffix={badge}
        />
      )
    case "tool_result":
      return (
        <CollapsibleBlock
          label={`tool_result${block.toolName ? ` (${block.toolName})` : ""}`}
          content={formatResult(block.result)}
          borderColor={isErrorResult(block.result) ? "border-red-400" : "border-purple-400"}
          labelColor={isErrorResult(block.result) ? "text-red-600" : "text-purple-600"}
          bgColor={isErrorResult(block.result) ? "bg-red-50" : "bg-purple-50"}
          defaultExpanded={isErrorResult(block.result)}
          mono
          icon={isErrorResult(block.result) ? <FeatherAlertCircle className="w-3 h-3" /> : undefined}
          suffix={badge}
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
          suffix={badge}
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
          suffix={badge}
        />
      )
    case "empty_nudge":
      return null
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

const useBlockStore = () => useSyncExternalStore(subscribeBlocks, getAllBlocks, getAllBlocks)

export const DebugStreamPanel = ({ onClose }: DebugStreamPanelProps) => {
  const { position, handleMouseDown } = useDraggable({ x: 16, y: 16 }, { x: "left" })
  const { history, streaming, streamingToolArgs, streamingReasoning, streamingToolName } = useChat()
  const allBlocks = useBlockStore()
  const [copiedAll, setCopiedAll] = useState(false)

  const handleCopyAll = () => {
    const tools = `[tools]\n${formatToolDefinitions()}`
    const schemas = `[block schemas]\n${formatBlockSchemaDefinitions()}`
    const blocks = formatAllBlocks(history)
    const content = [tools, schemas, blocks].filter(Boolean).join("\n\n---\n\n")
    navigator.clipboard.writeText(content)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  return (
    <div
      style={{ left: position.x, bottom: position.y }}
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

      <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-3 px-3 py-3">
        {allBlocks.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-neutral-400">No blocks yet</span>
          </div>
        )}
        {allBlocks.map((block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
        <StreamingIndicator
          streaming={streaming}
          streamingToolArgs={streamingToolArgs}
          streamingReasoning={streamingReasoning}
          streamingToolName={streamingToolName}
        />
      </AutoScroll>
    </div>
  )
}
