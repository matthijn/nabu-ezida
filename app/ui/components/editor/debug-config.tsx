import type { ReactNode } from "react"
import {
  FeatherBug,
  FeatherCloud,
  FeatherCode,
  FeatherActivity,
  FeatherSparkles,
  FeatherFilter,
} from "@subframe/core"

interface DebugToggle {
  key: string
  label: string
  icon: ReactNode
  defaultValue: boolean
}

export const DEBUG_TOGGLES: DebugToggle[] = [
  { key: "expanded", label: "Hidden files", icon: <FeatherBug />, defaultValue: false },
  {
    key: "persistToServer",
    label: "Server persistence",
    icon: <FeatherCloud />,
    defaultValue: true,
  },
  { key: "renderAsJson", label: "JSON rendering", icon: <FeatherCode />, defaultValue: false },
  { key: "showStreamPanel", label: "Stream panel", icon: <FeatherActivity />, defaultValue: false },
  {
    key: "reasoningSummaryAuto",
    label: "Reasoning summary",
    icon: <FeatherSparkles />,
    defaultValue: false,
  },
  { key: "stepCompaction", label: "Step compaction", icon: <FeatherFilter />, defaultValue: false },
  { key: "skipLlmFilter", label: "Skip LLM filter", icon: <FeatherFilter />, defaultValue: false },
]

export type DebugOptions = Record<string, boolean>

export const DEFAULT_DEBUG_OPTIONS: DebugOptions = Object.fromEntries(
  DEBUG_TOGGLES.map((t) => [t.key, t.defaultValue])
)
