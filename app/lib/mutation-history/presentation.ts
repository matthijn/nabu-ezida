import type { ComponentType } from "react"
import {
  FeatherPlus,
  FeatherEdit3,
  FeatherTrash,
  FeatherTag,
  FeatherType,
  FeatherFileText,
  FeatherArrowRight,
} from "@subframe/core"
import type { HistoryEntry, HistoryVerb } from "./types"

type IconVariant = "brand" | "neutral" | "error" | "success" | "warning"

type EntryPresentation = {
  icon: ComponentType<{ className?: string }>
  variant: IconVariant
  verbLabel: string
  entityLabel: string
  subtitle: string
}

export const truncateLabel = (text: string, max = 60): string =>
  text.length <= max ? text : text.slice(0, max) + "…"

const verbIcon: Record<HistoryVerb, ComponentType<{ className?: string }>> = {
  added: FeatherPlus,
  created: FeatherPlus,
  removed: FeatherTrash,
  deleted: FeatherTrash,
  updated: FeatherEdit3,
  renamed: FeatherArrowRight,
}

const verbVariant: Record<HistoryVerb, IconVariant> = {
  added: "success",
  created: "success",
  removed: "error",
  deleted: "error",
  updated: "neutral",
  renamed: "neutral",
}

const entityKindVerb: Record<string, Record<string, string>> = {
  annotation: { added: "Added annotation", removed: "Removed annotation", updated: "Updated annotation" },
  code: { added: "Applied code", removed: "Removed code", updated: "Updated code", created: "Created code" },
  tag: { added: "Added tag", removed: "Removed tag" },
  text: { updated: "Updated text" },
  file: { created: "Created file", deleted: "Deleted file", renamed: "Renamed file" },
}

const formatEntityVerb = (entry: HistoryEntry): string =>
  entityKindVerb[entry.entityKind]?.[entry.verb] ?? `${entry.verb} ${entry.entityKind}`

const entityKindIcon: Record<string, ComponentType<{ className?: string }>> = {
  tag: FeatherTag,
  text: FeatherType,
  file: FeatherFileText,
}

const getIcon = (entry: HistoryEntry): ComponentType<{ className?: string }> =>
  entityKindIcon[entry.entityKind] ?? verbIcon[entry.verb]

export const presentEntry = (entry: HistoryEntry): EntryPresentation => ({
  icon: getIcon(entry),
  variant: verbVariant[entry.verb],
  verbLabel: formatEntityVerb(entry),
  entityLabel: truncateLabel(entry.label),
  subtitle: entry.newPath ?? entry.path,
})

const MINUTE = 60_000
const HOUR = 60 * MINUTE

export const formatRelativeTime = (ts: number, now: number): string => {
  const diff = now - ts
  if (diff < MINUTE) return "just now"
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`
  return `${Math.floor(diff / HOUR)}h`
}

export type TimeGroup = {
  label: string
  entries: HistoryEntry[]
}

const FIVE_MINUTES = 5 * MINUTE

export const groupByTime = (entries: HistoryEntry[]): TimeGroup[] => {
  if (entries.length === 0) return []

  const reversed = [...entries].reverse()
  const groups: TimeGroup[] = []
  let current: TimeGroup | null = null

  for (const entry of reversed) {
    const prevTs = current?.entries[current.entries.length - 1]?.timestamp
    const isNewGroup = !current || (prevTs !== undefined && prevTs - entry.timestamp > FIVE_MINUTES)

    if (isNewGroup) {
      current = { label: new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), entries: [] }
      groups.push(current)
    }
    current!.entries.push(entry)
  }

  return groups
}
