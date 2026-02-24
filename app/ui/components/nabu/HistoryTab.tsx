"use client"

import { useState, useMemo } from "react"
import Markdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { FeatherFileText, FeatherSearch } from "@subframe/core"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"
import { useMutationHistory, presentEntry, formatRelativeTime, groupByTime } from "~/lib/mutation-history"
import type { HistoryEntry } from "~/lib/mutation-history"
import { subtleBackground, hoveredElementBackground, lowContrastText } from "~/lib/colors/radix"
import { matchesAny } from "~/lib/filter/match"
import { toDisplayName } from "~/lib/files/filename"

const remarkPlugins = [remarkGfm]
const stripP = { p: ({ children }: { children?: React.ReactNode }) => <>{children}</> }

const filterEntries = (entries: HistoryEntry[], query: string): HistoryEntry[] =>
  entries.filter((e) => matchesAny(query, [e.label, e.path, e.entityKind, e.verb]))

const buildEntryUrl = (projectId: string, path: string, entityId: string | null): string =>
  entityId
    ? `/project/${projectId}/file/${path}?entity=${entityId}`
    : `/project/${projectId}/file/${path}`

const entryBackground = (color?: string): string | undefined =>
  color ? subtleBackground(color) : undefined

const entryHoverBackground = (color?: string): string | undefined =>
  color ? hoveredElementBackground(color) : undefined

const entryAccentColor = (color?: string): string | undefined =>
  color ? lowContrastText(color) : undefined

type HistoryEntryRowProps = {
  entry: HistoryEntry
  now: number
  projectId: string | null
  navigate: (url: string) => void
}

const HistoryEntryRow = ({ entry, now, projectId, navigate }: HistoryEntryRowProps) => {
  const { icon: Icon, variant, verbLabel, entityLabel, subtitle } = presentEntry(entry)
  const bg = entryBackground(entry.color)
  const hoverBg = entryHoverBackground(entry.color)
  const accent = entryAccentColor(entry.color)
  const clickable = projectId !== null

  const handleClick = clickable
    ? () => navigate(buildEntryUrl(projectId, entry.path, entry.entityId))
    : undefined

  return (
    <div
      role={clickable ? "button" : undefined}
      onClick={handleClick}
      className={`flex w-full flex-col items-start gap-2 rounded-xl px-4 py-3 transition-all${clickable ? " cursor-pointer" : ""}`}
      style={{ backgroundColor: bg ?? "white" }}
      onMouseEnter={hoverBg ? (e) => { e.currentTarget.style.backgroundColor = hoverBg } : undefined}
      onMouseLeave={bg ? (e) => { e.currentTarget.style.backgroundColor = bg } : undefined}
    >
      <div className="flex w-full items-start gap-3">
        <IconWithBackground className="mt-0.5" variant={variant} size="small" icon={<Icon />} />
        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
          <span className="text-body font-body text-default-font">
            <span>{verbLabel} </span>
            <span style={accent ? { color: accent } : undefined} className="font-medium">
              <Markdown remarkPlugins={remarkPlugins} components={stripP}>{entityLabel}</Markdown>
            </span>
          </span>
          <div className="flex w-full items-center gap-1.5">
            <FeatherFileText className="text-caption font-caption text-subtext-color" />
            <span className="text-caption font-caption text-subtext-color">
              {toDisplayName(subtitle)}
            </span>
          </div>
        </div>
        <span className="text-caption font-caption text-neutral-400 flex-none">
          {formatRelativeTime(entry.timestamp, now)}
        </span>
      </div>
    </div>
  )
}

type TimeGroupSectionProps = {
  label: string
  entries: HistoryEntry[]
  now: number
  projectId: string | null
  navigate: (url: string) => void
}

const TimeGroupSection = ({ label, entries, now, projectId, navigate }: TimeGroupSectionProps) => (
  <div className="flex w-full flex-col items-start gap-3">
    <div className="flex w-full items-center gap-2 py-1">
      <span className="font-['Manrope'] text-[12px] font-[500] leading-[16px] tracking-wider text-subtext-color uppercase">
        {label}
      </span>
      <div className="flex h-px grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
    </div>
    {entries.map((entry, i) => (
      <HistoryEntryRow key={`${entry.timestamp}-${entry.entityId}-${i}`} entry={entry} now={now} projectId={projectId} navigate={navigate} />
    ))}
  </div>
)

export type HistoryTabProps = {
  files: Record<string, string>
  projectId: string | null
  navigate: (url: string) => void
}

export const HistoryTab = ({ projectId, navigate }: HistoryTabProps) => {
  const entries = useMutationHistory()
  const [query, setQuery] = useState("")
  const now = useMemo(() => Date.now(), [entries])
  const filtered = useMemo(() => filterEntries(entries, query), [entries, query])
  const groups = useMemo(() => groupByTime(filtered), [filtered])

  return (
    <>
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 bg-neutral-50 px-4 py-4 overflow-y-auto">
        {groups.length === 0 && (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-body font-body text-subtext-color">
              {entries.length === 0 ? "No changes yet" : "No matches"}
            </span>
          </div>
        )}
        {groups.map((group) => (
          <TimeGroupSection key={group.label} label={group.label} entries={group.entries} now={now} projectId={projectId} navigate={navigate} />
        ))}
      </div>
      <div className="flex w-full items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
        <FeatherSearch className="text-neutral-400 flex-none" />
        <TextFieldUnstyled className="grow min-h-5">
          <TextFieldUnstyled.Input
            placeholder="Search history..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </TextFieldUnstyled>
      </div>
    </>
  )
}
