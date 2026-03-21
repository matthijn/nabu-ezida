"use client"

import { useState, useMemo } from "react"
import { FeatherBookmark, FeatherTrash2 } from "@subframe/core"
import type { SearchEntry } from "~/domain/search"
import { IconButton } from "~/ui/components/IconButton"
import { SidebarHeader } from "~/ui/components/sidebar/SidebarHeader"
import { matchesAny } from "~/lib/utils/filter"

interface SearchSidebarProps {
  recentSearches: SearchEntry[]
  savedSearches: SearchEntry[]
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
      icon={showTrash ? <FeatherTrash2 /> : <FeatherBookmark />}
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
  onSave,
  onRemove,
  onSelect,
}: {
  entry: SearchEntry
  onSave: () => void
  onRemove: () => void
  onSelect: () => void
}) => (
  <div
    className="flex w-full cursor-pointer items-center justify-between px-6 py-3 hover:bg-neutral-50"
    onClick={onSelect}
  >
    <div className="flex min-w-0 flex-col items-start gap-1">
      <div className="flex items-center gap-3">
        <SearchItemBookmark saved={entry.saved} onSave={onSave} onRemove={onRemove} />
        <span className="text-body font-body text-default-font">{entry.title}</span>
      </div>
      <span className="text-caption font-caption text-subtext-color pl-10">
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

export function SearchSidebar({
  recentSearches,
  savedSearches,
  onSave,
  onRemove,
  onSelect,
}: SearchSidebarProps) {
  const [filterValue, setFilterValue] = useState("")

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
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start pt-2 overflow-y-auto">
        {hasEntries(filteredRecent) && (
          <>
            <SectionHeader label="RECENT SEARCHES" />
            {filteredRecent.map((entry) => (
              <SearchItem
                key={entry.id}
                entry={entry}
                onSave={() => onSave(entry.id)}
                onRemove={() => onRemove(entry.id)}
                onSelect={() => onSelect(entry.id)}
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
                onSave={() => onSave(entry.id)}
                onRemove={() => onRemove(entry.id)}
                onSelect={() => onSelect(entry.id)}
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
