"use client"

import { useState, useSyncExternalStore } from "react"
import { ChevronRight, ChevronDown, Copy, Check } from "lucide-react"
import { AutoScroll } from "~/ui/components/AutoScroll"
import { getRawCalls, subscribeRawCalls } from "~/lib/agent/client"
import type { RawLlmCall } from "~/lib/agent/client"

const formatDuration = (ms: number): string =>
  ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`

const prettyJson = (json: string): string => {
  try {
    return JSON.stringify(JSON.parse(json), null, 2)
  } catch {
    return json
  }
}

const PREVIEW_LENGTH = 80

const endpointLabel = (endpoint: string): string => {
  const parts = endpoint.split("?")
  return parts[0]
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false)
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={handleCopy} className="p-1 text-neutral-400 hover:text-neutral-600">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

interface SectionProps {
  label: string
  displayContent: string
  copyContent: string
  borderColor: string
  labelColor: string
}

const Section = ({ label, displayContent, copyContent, borderColor, labelColor }: SectionProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={`border-l-2 ${borderColor} pl-2`}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1 text-xs ${labelColor} font-medium hover:opacity-80`}
        >
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          {label}
        </button>
        <CopyButton text={copyContent} />
      </div>
      {expanded && (
        <pre className="mt-1 max-h-[400px] overflow-auto rounded bg-neutral-50 p-2 text-xs font-mono text-neutral-700 whitespace-pre-wrap">
          {displayContent}
        </pre>
      )}
      {!expanded && (
        <span className="text-xs text-neutral-400 pl-4">
          {displayContent.slice(0, PREVIEW_LENGTH).replace(/\n/g, " ")}
          {displayContent.length > PREVIEW_LENGTH ? "..." : ""}
        </span>
      )}
    </div>
  )
}

const RawCallEntry = ({ call }: { call: RawLlmCall }) => {
  const [expanded, setExpanded] = useState(false)
  const time = new Date(call.timestamp).toLocaleTimeString()

  return (
    <div className="rounded border border-neutral-200">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-50"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-neutral-400" />
          )}
          <span className="text-xs font-mono font-medium text-neutral-700">
            {endpointLabel(call.endpoint)}
          </span>
        </div>
        <span className="text-xs text-neutral-400">
          {formatDuration(call.duration)} · {time}
        </span>
      </button>
      {expanded && (
        <div className="flex flex-col gap-2 border-t border-neutral-100 px-3 py-2">
          <Section
            label="Input"
            displayContent={prettyJson(call.requestBody)}
            copyContent={call.requestBody}
            borderColor="border-blue-300"
            labelColor="text-blue-600"
          />
          <Section
            label="Output"
            displayContent={prettyJson(call.rawResponse)}
            copyContent={call.rawResponse}
            borderColor="border-green-300"
            labelColor="text-green-600"
          />
        </div>
      )}
    </div>
  )
}

const useRawCalls = () => useSyncExternalStore(subscribeRawCalls, getRawCalls, getRawCalls)

export const DebugRawTab = () => {
  const calls = useRawCalls()

  if (calls.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-sm text-neutral-400">No LLM calls yet</span>
      </div>
    )
  }

  return (
    <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-2 px-3 py-3">
      {calls.map((call) => (
        <RawCallEntry key={call.id} call={call} />
      ))}
    </AutoScroll>
  )
}
