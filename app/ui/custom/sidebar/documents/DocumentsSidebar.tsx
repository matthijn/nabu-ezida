"use client"

import type { ComponentType } from "react"
import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherHash, FeatherSearch, FeatherPlus } from "@subframe/core"
import type { TagDefinition } from "~/domain/settings"
import { TextField } from "~/ui/components/TextField"
import { Button } from "~/ui/components/Button"
import { Badge } from "~/ui/components/Badge"
import { matchesAny } from "~/lib/filter"
import {
  subtleBackground,
  elementBackground,
  solidBackground,
  lowContrastText,
  highContrastText,
  type RadixColor,
} from "~/lib/colors/radix"
import { resolveFeatherIcon } from "~/lib/icons/feather-map"
import { humanize } from "./TagGroupHeader"
import { DocumentItem } from "./DocumentItem"

export type ListItem = {
  id: string
  title: string
  editedAt: string
  tags: string[]
}

type DocumentsSidebarProps = {
  documents: ListItem[]
  selectedId?: string
  searchValue?: string
  tagDefinitions?: TagDefinition[]
  onSearchChange?: (value: string) => void
  onDocumentSelect?: (id: string) => void
  onNewDocument?: () => void
}

const DEFAULT_TAG_COLOR: RadixColor = "lime"
const UNGROUPED = "ungrouped"

type TagGroup = { tag: string; docs: ListItem[] }

const groupByTag = (docs: ListItem[]): TagGroup[] => {
  const tagMap = new Map<string, ListItem[]>()
  for (const doc of docs) {
    const tags = doc.tags.length > 0 ? doc.tags : [UNGROUPED]
    for (const tag of tags) {
      const existing = tagMap.get(tag)
      if (existing) existing.push(doc)
      else tagMap.set(tag, [doc])
    }
  }
  return Array.from(tagMap, ([tag, docs]) => ({ tag, docs }))
}

const filterGroups = (groups: TagGroup[], query: string): TagGroup[] => {
  if (query.length === 0) return groups
  return groups.reduce<TagGroup[]>((acc, { tag, docs }) => {
    const tagMatches = matchesAny(query, [tag])
    if (tagMatches) {
      acc.push({ tag, docs })
      return acc
    }
    const matchingDocs = docs.filter((doc) => matchesAny(query, [doc.title]))
    if (matchingDocs.length > 0) acc.push({ tag, docs: matchingDocs })
    return acc
  }, [])
}

const sortGroups = (groups: TagGroup[], activeTags: Set<string>, lookup: Map<string, ResolvedTag>): TagGroup[] =>
  [...groups].sort((a, b) => {
    const aActive = activeTags.has(a.tag)
    const bActive = activeTags.has(b.tag)
    if (aActive !== bActive) return aActive ? -1 : 1
    if (a.tag === UNGROUPED) return 1
    if (b.tag === UNGROUPED) return -1
    const aDisplay = resolveTag(lookup, a.tag).display
    const bDisplay = resolveTag(lookup, b.tag).display
    return aDisplay.localeCompare(bDisplay)
  })

const findTagsForDoc = (groups: TagGroup[], docId: string | undefined): Set<string> => {
  if (!docId) return new Set()
  return new Set(groups.filter((g) => g.docs.some((d) => d.id === docId)).map((g) => g.tag))
}

type ResolvedTag = {
  color: RadixColor
  display: string
  icon: ComponentType<{ className?: string }>
}

const buildTagLookup = (definitions: TagDefinition[]): Map<string, ResolvedTag> =>
  new Map(definitions.map((d) => [d.id, { color: d.color, display: d.display, icon: resolveFeatherIcon(d.icon) }]))

const resolveTag = (lookup: Map<string, ResolvedTag>, tag: string): ResolvedTag =>
  lookup.get(tag) ?? { color: DEFAULT_TAG_COLOR, display: humanize(tag), icon: FeatherHash }

export function DocumentsSidebar({
  documents,
  selectedId,
  searchValue = "",
  tagDefinitions,
  onSearchChange,
  onDocumentSelect,
  onNewDocument,
}: DocumentsSidebarProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)
  const tagLookup = useMemo(() => buildTagLookup(tagDefinitions ?? []), [tagDefinitions])

  const unsortedGroups = useMemo(() => groupByTag(documents), [documents])
  const activeTags = useMemo(() => findTagsForDoc(unsortedGroups, selectedId), [unsortedGroups, selectedId])
  const allGroups = useMemo(() => sortGroups(unsortedGroups, activeTags, tagLookup), [unsortedGroups, activeTags, tagLookup])
  const groups = useMemo(() => filterGroups(allGroups, searchValue), [allGroups, searchValue])

  const activeGroupCount = activeTags.size > 0 ? groups.filter((g) => activeTags.has(g.tag)).length : 0

  const hoveredGroup = hoveredTag ? groups.find((g) => g.tag === hoveredTag) : null
  const hoveredResolved = hoveredTag ? resolveTag(tagLookup, hoveredTag) : null
  const HoveredIcon = hoveredResolved?.icon ?? FeatherHash

  return (
    <div className="relative z-10 flex h-full w-56 flex-none flex-col items-start bg-default-background shadow-lg">
      <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-2 font-heading-2 text-default-font">Documents</span>
          <Button variant="brand-primary" size="small" icon={<FeatherPlus />} onClick={onNewDocument}>New</Button>
        </div>
        <TextField className="h-auto w-full flex-none" variant="filled" label="" helpText="" icon={<FeatherSearch />}>
          <TextField.Input
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </TextField>
      </div>
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start py-2 overflow-y-auto">
        {groups.flatMap(({ tag, docs }, i) => {
          const resolved = resolveTag(tagLookup, tag)
          const TagIcon = resolved.icon
          const isHovered = hoveredTag === tag
          const isActive = activeTags.has(tag)
          const highlighted = isHovered || isActive
          const needsDivider = isActive && activeGroupCount > 0 && i === activeGroupCount - 1 && i < groups.length - 1
          const row = (
            <div
              key={tag}
              className="relative flex w-full cursor-default items-center gap-2 px-4 py-2.5 hover:bg-neutral-50"
              style={highlighted ? { backgroundColor: elementBackground(resolved.color) } : undefined}
              onMouseEnter={() => setHoveredTag(tag)}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: solidBackground(resolved.color) }}
                />
              )}
              <span className="flex-none" style={highlighted ? { color: lowContrastText(resolved.color) } : undefined}>
                <TagIcon className="text-body font-body" />
              </span>
              <span
                className="grow shrink-0 basis-0 truncate text-body font-body text-default-font"
                style={highlighted ? { color: highContrastText(resolved.color) } : undefined}
              >
                {resolved.display}
              </span>
              <Badge variant="neutral" className="flex-none">{docs.length}</Badge>
            </div>
          )
          if (needsDivider) return [row, <div key="active-divider" className="border-b border-solid border-neutral-border w-full" />]
          return [row]
        })}
      </div>

      <AnimatePresence>
        {hoveredGroup && (
          <motion.div
            key="documents-panel"
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute left-full top-0 h-full w-72 flex flex-col items-start bg-default-background [box-shadow:4px_0_6px_-1px_rgb(0_0_0/0.1),4px_0_4px_-2px_rgb(0_0_0/0.1)]"
          >
            <div
              className="flex w-full items-center gap-2 border-b-2 border-solid px-4 py-4"
              style={{
                backgroundColor: elementBackground(hoveredResolved?.color ?? DEFAULT_TAG_COLOR),
                borderColor: solidBackground(hoveredResolved?.color ?? DEFAULT_TAG_COLOR),
              }}
            >
              <span className="flex-none" style={{ color: lowContrastText(hoveredResolved?.color ?? DEFAULT_TAG_COLOR) }}>
                <HoveredIcon className="text-body font-body" />
              </span>
              <span
                className="text-heading-3 font-heading-3"
                style={{ color: highContrastText(hoveredResolved?.color ?? DEFAULT_TAG_COLOR) }}
              >
                {hoveredResolved?.display ?? humanize(hoveredTag!)}
              </span>
            </div>
            <div className="flex w-full grow shrink-0 basis-0 flex-col items-start overflow-y-auto">
              {hoveredGroup.docs.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  title={doc.title}
                  editedAt={doc.editedAt}
                  color={hoveredResolved?.color ?? DEFAULT_TAG_COLOR}
                  selected={doc.id === selectedId}
                  onClick={() => { onDocumentSelect?.(doc.id); setHoveredTag(null) }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
