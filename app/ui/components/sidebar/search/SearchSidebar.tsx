"use client"

import { useState, useMemo } from "react"
import { FeatherBookmark, FeatherTrash2 } from "@subframe/core"
import type { SearchEntry } from "~/domain/search"
import { IconButton } from "~/ui/components/IconButton"
import { SidebarHeader } from "~/ui/components/sidebar/SidebarHeader"
import { matchesAny } from "~/lib/utils/filter"
import { cn } from "~/ui/utils"

interface SearchSidebarProps {
  recentSearches: SearchEntry[]
  savedSearches: SearchEntry[]
  selectedId?: string
  onSave: (id: string) => void
  onRemove: (id: string) => void
  onSelect: (id: string) => void
}

const SearchItemBookmark = ({
  saved,
  onSave,
  onRemove,
}: {
  saved: boolean
  onSave: () => void
  onRemove: () => void
}) => {
  const [hovered, setHovered] = useState(false)
  const showTrash = saved && hovered

  return (
    <IconButton
      variant={saved ? "brand-tertiary" : "neutral-tertiary"}
      size="small"
      icon={
        showTrash ? (
          <FeatherTrash2 />
        ) : (
          <FeatherBookmark className={saved ? "[&_path]:fill-current" : undefined} />
        )
      }
      className={saved ? "text-brand-600" : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        if (saved) onRemove()
        else onSave()
      }}
    />
  )
}

const SearchItem = ({
  entry,
  selected,
  highlighted,
  onSave,
  onRemove,
  onSelect,
  onMouseEnter,
}: {
  entry: SearchEntry
  selected: boolean
  highlighted: boolean
  onSave: () => void
  onRemove: () => void
  onSelect: () => void
  onMouseEnter: () => void
}) => (
  <div
    className={cn(
      "flex w-full cursor-pointer items-center justify-between py-3",
      selected ? "border-l-4 border-solid border-brand-600 px-5" : "px-6",
      highlighted && "bg-brand-50"
    )}
    onClick={onSelect}
    onMouseEnter={onMouseEnter}
  >
    <div className="flex min-w-0 flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        <SearchItemBookmark saved={entry.saved} onSave={onSave} onRemove={onRemove} />
        <span
          className={cn(
            "text-body font-body",
            highlighted ? "text-brand-800" : "text-default-font"
          )}
        >
          {entry.title}
        </span>
      </div>
      <span
        className={cn(
          "text-caption font-caption pl-10",
          highlighted ? "text-brand-700" : "text-subtext-color"
        )}
      >
        {entry.description}
      </span>
    </div>
  </div>
)

const SectionHeader = ({ label }: { label: string }) => (
  <div className="flex w-full items-center justify-between px-6 py-2">
    <span className="text-caption-bold font-caption-bold text-subtext-color">{label}</span>
  </div>
)

const matchesSearch = (entry: SearchEntry, query: string): boolean =>
  matchesAny(query, [entry.title, entry.description])

const filterEntries = (entries: SearchEntry[], query: string): SearchEntry[] =>
  query.length === 0 ? entries : entries.filter((e) => matchesSearch(e, query))

const hasEntries = (entries: SearchEntry[]): boolean => entries.length > 0

const isHighlighted = (entryId: string, hoveredId: string | null, selectedId?: string): boolean =>
  hoveredId === null ? entryId === selectedId : entryId === hoveredId

export function SearchSidebar({
  recentSearches,
  savedSearches,
  selectedId,
  onSave,
  onRemove,
  onSelect,
}: SearchSidebarProps) {
  const [filterValue, setFilterValue] = useState("")
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const filteredRecent = useMemo(
    () => filterEntries(recentSearches, filterValue),
    [recentSearches, filterValue]
  )
  const filteredSaved = useMemo(
    () => filterEntries(savedSearches, filterValue),
    [savedSearches, filterValue]
  )

  return (
    <div className="flex h-full w-80 flex-none flex-col items-start bg-default-background shadow-lg">
      <SidebarHeader
        title="Search"
        filterPlaceholder="Filter results..."
        filterValue={filterValue}
        onFilterChange={setFilterValue}
        onNew={() => undefined}
      />
      <div
        className="flex w-full grow shrink-0 basis-0 flex-col items-start pt-2 overflow-y-auto"
        onMouseLeave={() => setHoveredId(null)}
      >
        {hasEntries(filteredRecent) && (
          <>
            <SectionHeader label="RECENT SEARCHES" />
            {filteredRecent.map((entry) => (
              <SearchItem
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedId}
                highlighted={isHighlighted(entry.id, hoveredId, selectedId)}
                onSave={() => onSave(entry.id)}
                onRemove={() => onRemove(entry.id)}
                onSelect={() => onSelect(entry.id)}
                onMouseEnter={() => setHoveredId(entry.id)}
              />
            ))}
          </>
        )}
        {hasEntries(filteredRecent) && hasEntries(filteredSaved) && (
          <div className="flex h-px w-full flex-none bg-neutral-200 my-2" />
        )}
        {hasEntries(filteredSaved) && (
          <>
            <SectionHeader label="SAVED SEARCHES" />
            {filteredSaved.map((entry) => (
              <SearchItem
                key={entry.id}
                entry={entry}
                selected={entry.id === selectedId}
                highlighted={isHighlighted(entry.id, hoveredId, selectedId)}
                onSave={() => onSave(entry.id)}
                onRemove={() => onRemove(entry.id)}
                onSelect={() => onSelect(entry.id)}
                onMouseEnter={() => setHoveredId(entry.id)}
              />
            ))}
          </>
        )}
        {!hasEntries(filteredRecent) && !hasEntries(filteredSaved) && (
          <div className="flex w-full items-center justify-center px-6 py-8">
            <span className="text-body font-body text-subtext-color">No searches yet</span>
          </div>
        )}
      </div>
    </div>
  )
}
