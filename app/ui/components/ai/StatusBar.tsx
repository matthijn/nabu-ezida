"use client"

import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherLoader2, FeatherCircle } from "@subframe/core"
import { InlineMarkdown } from "~/ui/components/InlineMarkdown"
import type { PlanStatus } from "~/lib/chat/plan-status"
import type { Block } from "~/lib/agent"
import { getSpinnerLabel } from "~/lib/chat/spinnerLabel"

const AnimatedDots = () => {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setFrame((f) => (f + 1) % 3), 400)
    return () => clearInterval(interval)
  }, [])

  return <>{".".repeat(frame + 1)}</>
}

type SpinnerRowProps = {
  label: string
}

const SpinnerRow = ({ label }: SpinnerRowProps) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={label}
      className="flex items-start gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <FeatherLoader2 className="text-body text-brand-600 mt-0.5 flex-none animate-spin" />
      <span className="text-body font-body text-subtext-color">
        {label}<AnimatedDots />
      </span>
    </motion.div>
  </AnimatePresence>
)

type NextStepRowProps = {
  description: string
}

const NextStepRow = ({ description }: NextStepRowProps) => (
  <div className="flex items-start gap-2">
    <FeatherCircle className="text-body text-neutral-300 mt-0.5 flex-none" />
    <span className="text-body font-body text-neutral-400">
      <InlineMarkdown>{description}</InlineMarkdown>
    </span>
  </div>
)

type PlanStatusBarProps = {
  status: PlanStatus
}

const PlanStatusBar = ({ status }: PlanStatusBarProps) => (
  <div className="flex flex-col gap-1 px-4 py-2 border-t border-solid border-neutral-border bg-neutral-50 rounded-b-lg">
    {status.current && <SpinnerRow label={status.current.description} />}
    {status.next && <NextStepRow description={status.next.description} />}
  </div>
)

type LoadingBarProps = {
  history: Block[]
  streamingReasoning: string
  streamingToolName: string | null
}

const getFirstLine = (text: string): string | null => {
  const trimmed = text.trim()
  if (!trimmed) return null
  const firstLine = trimmed.split("\n")[0]
  return firstLine.replace(/^\*\*|\*\*$/g, "").trim() || null
}

const LoadingBar = ({ history, streamingReasoning, streamingToolName }: LoadingBarProps) => {
  const reasoningLabel = getFirstLine(streamingReasoning)
  const label = reasoningLabel ?? getSpinnerLabel(history, streamingToolName)

  return (
    <div className="px-4 py-2 border-t border-solid border-neutral-border bg-neutral-50 rounded-b-lg">
      <SpinnerRow label={label} />
    </div>
  )
}

export type StatusBarProps = {
  planStatus: PlanStatus | null
  loading: boolean
  history: Block[]
  streamingReasoning: string
  streamingToolName: string | null
}

export const StatusBar = ({ planStatus, loading, history, streamingReasoning, streamingToolName }: StatusBarProps) => {
  if (planStatus) return <PlanStatusBar status={planStatus} />
  if (loading) return <LoadingBar history={history} streamingReasoning={streamingReasoning} streamingToolName={streamingToolName} />
  return null
}
