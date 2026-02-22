"use client"

import { useState } from "react"
import { useSyncExternalStore } from "react"
import { FeatherX, FeatherChevronRight, FeatherChevronDown, FeatherAlertCircle, FeatherCopy, FeatherCheck, FeatherListX } from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { useDraggable } from "~/hooks/useDraggable"
import { getToolDefinitions } from "~/lib/agent/executors"
import { deriveMode, modes } from "~/lib/agent/executors/modes"
import { getBlockSchemaDefinitions } from "~/domain/blocks/registry"
import { getAllBlocksWithDraft, subscribeBlocks, isDraft } from "~/lib/agent/block-store"
import type { Block, ToolCall } from "~/lib/agent"

type BlockRendererProps = {
  block: Block
  selected: boolean
  onToggleSelect: () => void
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

const formatToolCallDraft = (calls: ToolCall[]): string => {
  const call = calls[0]
  if (!call) return ""
  return call.name
    ? `${call.name}\n  ${String(call.args)}`
    : String(call.args)
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
    case "error":
      return `[error]\n${block.content}`
  }
}

const formatAllBlocks = (blocks: Block[]): string =>
  blocks.map(formatBlock).join("\n\n---\n\n")

const toggleIndex = (set: Set<number>, index: number): Set<number> => {
  const next = new Set(set)
  if (next.has(index)) next.delete(index)
  else next.add(index)
  return next
}

const filterByIndices = <T,>(items: T[], indices: Set<number>): T[] =>
  items.filter((_, i) => indices.has(i))

type CollapsibleBlockProps = {
  label: string
  content: string
  copyContent?: string
  borderColor: string
  labelColor: string
  bgColor?: string
  defaultExpanded?: boolean
  mono?: boolean
  icon?: React.ReactNode
  selected: boolean
  onToggleSelect: () => void
}

const CollapsibleBlock = ({ label, content, copyContent, borderColor, labelColor, bgColor, defaultExpanded = true, mono = false, icon, selected, onToggleSelect }: CollapsibleBlockProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(copyContent ?? content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleSelect()
  }

  return (
    <div className={`border-l-2 ${borderColor} pl-2`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={selected}
            onClick={handleToggle}
            readOnly
            className="w-3 h-3 accent-neutral-500 cursor-pointer"
          />
          <button
            onClick={() => setExpanded(!expanded)}
            className={`flex items-center gap-1 text-xs ${labelColor} font-medium hover:opacity-80`}
          >
            {expanded ? <FeatherChevronDown className="w-3 h-3" /> : <FeatherChevronRight className="w-3 h-3" />}
            {icon}
            {label}
          </button>
        </div>
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

const BlockRenderer = ({ block, selected, onToggleSelect }: BlockRendererProps) => {
  const copy = formatBlock(block)
  const sel = { selected, onToggleSelect }

  switch (block.type) {
    case "user":
      return (
        <CollapsibleBlock
          label="user"
          content={block.content}
          copyContent={copy}
          borderColor="border-blue-400"
          labelColor="text-blue-600"
          {...sel}
        />
      )
    case "text":
      return (
        <CollapsibleBlock
          label="assistant"
          content={block.content}
          copyContent={copy}
          borderColor="border-green-400"
          labelColor="text-green-600"
          {...sel}
        />
      )
    case "tool_call": {
      const content = isDraft(block)
        ? formatToolCallDraft(block.calls)
        : block.calls.map(formatToolCall).join("\n\n")
      return (
        <CollapsibleBlock
          label="tool_call"
          content={content}
          copyContent={copy}
          borderColor="border-orange-400"
          labelColor="text-orange-600"
          bgColor="bg-orange-50"
          mono
          {...sel}
        />
      )
    }
    case "tool_result":
      return (
        <CollapsibleBlock
          label={`tool_result${block.toolName ? ` (${block.toolName})` : ""}`}
          content={formatResult(block.result)}
          copyContent={copy}
          borderColor={isErrorResult(block.result) ? "border-red-400" : "border-purple-400"}
          labelColor={isErrorResult(block.result) ? "text-red-600" : "text-purple-600"}
          bgColor={isErrorResult(block.result) ? "bg-red-50" : "bg-purple-50"}
          defaultExpanded={isErrorResult(block.result)}
          mono
          icon={isErrorResult(block.result) ? <FeatherAlertCircle className="w-3 h-3" /> : undefined}
          {...sel}
        />
      )
    case "system":
      return (
        <CollapsibleBlock
          label="system"
          content={block.content}
          copyContent={copy}
          borderColor="border-gray-400"
          labelColor="text-gray-600"
          defaultExpanded={false}
          {...sel}
        />
      )
    case "reasoning":
      return (
        <>
          <CollapsibleBlock
            label="thinking"
            content={block.content}
            copyContent={copy}
            borderColor="border-yellow-400"
            labelColor="text-yellow-600"
            bgColor="bg-yellow-50"
            defaultExpanded={true}
            {...sel}
          />
          {block.encryptedContent && (
            <div className="border-l-2 border-yellow-300 pl-2 select-none">
              <span className="text-xs text-yellow-500 font-medium">&lt;encrypted&gt;</span>
            </div>
          )}
        </>
      )
    case "empty_nudge":
      return null
    case "error":
      return (
        <CollapsibleBlock
          label="error"
          content={block.content}
          copyContent={copy}
          borderColor="border-red-400"
          labelColor="text-red-600"
          bgColor="bg-red-50"
          icon={<FeatherAlertCircle className="w-3 h-3" />}
          {...sel}
        />
      )
  }
}

type DebugStreamPanelProps = {
  onClose: () => void
}

const useBlockStore = () => useSyncExternalStore(subscribeBlocks, getAllBlocksWithDraft, getAllBlocksWithDraft)

export const DebugStreamPanel = ({ onClose }: DebugStreamPanelProps) => {
  const { position, handleMouseDown } = useDraggable({ x: 16, y: 16 }, { x: "left" })
  const allBlocks = useBlockStore()
  const mode = deriveMode(allBlocks)
  const reasoning = modes[mode].reasoning
  const [copiedAll, setCopiedAll] = useState(false)
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  const hasSelection = selectedIndices.size > 0

  const handleCopyAll = () => {
    const blocksToFormat = hasSelection ? filterByIndices(allBlocks, selectedIndices) : allBlocks
    const parts = hasSelection
      ? [formatAllBlocks(blocksToFormat)]
      : [`[tools]\n${formatToolDefinitions()}`, `[block schemas]\n${formatBlockSchemaDefinitions()}`, formatAllBlocks(blocksToFormat)]
    const content = parts.filter(Boolean).join("\n\n---\n\n")
    navigator.clipboard.writeText(content)
    setCopiedAll(true)
    setTimeout(() => setCopiedAll(false), 1500)
  }

  const handleDeselectAll = () => setSelectedIndices(new Set())

  const handleToggleBlock = (index: number) =>
    setSelectedIndices(prev => toggleIndex(prev, index))

  return (
    <div
      style={{ left: position.x, bottom: position.y }}
      className="fixed z-50 flex h-[700px] w-[500px] flex-col rounded-lg border border-solid border-neutral-300 bg-white shadow-xl"
    >
      <div
        onMouseDown={handleMouseDown}
        className="flex w-full cursor-move items-center justify-between rounded-t-lg bg-neutral-100 px-4 py-2"
      >
        <span className="text-sm font-medium text-neutral-700">
          Debug Stream
          <span className="text-xs text-neutral-400 ml-2">{mode} · {reasoning}</span>
          {hasSelection && <span className="text-xs text-neutral-400 ml-1">({selectedIndices.size} selected)</span>}
        </span>
        <div className="flex items-center gap-1">
          {hasSelection && (
            <button
              onClick={handleDeselectAll}
              className="p-1 text-neutral-400 hover:text-neutral-600"
              title="Deselect all"
            >
              <FeatherListX className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCopyAll}
            className="p-1 text-neutral-500 hover:text-neutral-700"
            title={hasSelection ? `Copy ${selectedIndices.size} selected` : "Copy all messages"}
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
          <BlockRenderer
            key={i}
            block={block}
            selected={selectedIndices.has(i)}
            onToggleSelect={() => handleToggleBlock(i)}
          />
        ))}
      </AutoScroll>
    </div>
  )
}
