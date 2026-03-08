"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherHash, FeatherSearch, FeatherPlus } from "@subframe/core"
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
  tagColors?: Record<string, RadixColor>
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

const sortGroups = (groups: TagGroup[]): TagGroup[] =>
  [...groups].sort((a, b) =>
    a.tag === UNGROUPED ? 1 : b.tag === UNGROUPED ? -1 : a.tag.localeCompare(b.tag),
  )

const findTagsForDoc = (groups: TagGroup[], docId: string | undefined): Set<string> => {
  if (!docId) return new Set()
  return new Set(groups.filter((g) => g.docs.some((d) => d.id === docId)).map((g) => g.tag))
}

const resolveTagColor = (tagColors: Record<string, RadixColor> | undefined, tag: string): RadixColor =>
  tagColors?.[tag] ?? DEFAULT_TAG_COLOR

export function DocumentsSidebar({
  documents,
  selectedId,
  searchValue = "",
  tagColors,
  onSearchChange,
  onDocumentSelect,
  onNewDocument,
}: DocumentsSidebarProps) {
  const [hoveredTag, setHoveredTag] = useState<string | null>(null)

  const allGroups = useMemo(() => sortGroups(groupByTag(documents)), [documents])
  const groups = useMemo(() => filterGroups(allGroups, searchValue), [allGroups, searchValue])
  const activeTags = useMemo(() => findTagsForDoc(groups, selectedId), [groups, selectedId])

  const hoveredGroup = hoveredTag ? groups.find((g) => g.tag === hoveredTag) : null
  const hoveredColor = hoveredTag ? resolveTagColor(tagColors, hoveredTag) : DEFAULT_TAG_COLOR

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
        {groups.map(({ tag, docs }) => {
          const color = resolveTagColor(tagColors, tag)
          const isHovered = hoveredTag === tag
          const isActive = activeTags.has(tag)
          const highlighted = isHovered || isActive
          return (
            <div
              key={tag}
              className="relative flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 hover:bg-neutral-50"
              style={highlighted ? { backgroundColor: isActive ? elementBackground(color) : subtleBackground(color) } : undefined}
              onMouseEnter={() => setHoveredTag(tag)}
            >
              {isActive && (
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: solidBackground(color) }}
                />
              )}
              <FeatherHash
                className="text-body font-body flex-none"
                style={highlighted ? { color: lowContrastText(color) } : undefined}
              />
              <span
                className={`grow shrink-0 basis-0 truncate ${highlighted ? "text-body-bold font-body-bold" : "text-body font-body"} text-default-font`}
                style={highlighted ? { color: highContrastText(color) } : undefined}
              >
                {humanize(tag)}
              </span>
              <Badge variant="neutral" className="flex-none">{docs.length}</Badge>
            </div>
          )
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
            <div className="flex w-full items-center gap-2 border-b border-solid border-neutral-border px-4 py-4">
              <FeatherHash
                className="text-body font-body flex-none"
                style={{ color: lowContrastText(hoveredColor) }}
              />
              <span
                className="text-heading-3 font-heading-3"
                style={{ color: highContrastText(hoveredColor) }}
              >
                {humanize(hoveredTag!)}
              </span>
              <Badge variant="neutral" className="flex-none">{hoveredGroup.docs.length}</Badge>
            </div>
            <div className="flex w-full grow shrink-0 basis-0 flex-col items-start overflow-y-auto">
              {hoveredGroup.docs.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  title={doc.title}
                  editedAt={doc.editedAt}
                  color={hoveredColor}
                  selected={doc.id === selectedId}
                  onClick={() => onDocumentSelect?.(doc.id)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
