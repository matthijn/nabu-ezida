"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherSearch, FeatherPlus } from "@subframe/core"
import { TextField } from "~/ui/components/TextField"
import { Button } from "~/ui/components/Button"
import { matchesAny } from "~/lib/filter"
import {
  subtleBackground,
  subtleBorder,
  hoveredElementBorder,
  type RadixColor,
} from "~/lib/colors/radix"
import { TagGroupHeader } from "./TagGroupHeader"
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

const findTagForDoc = (groups: TagGroup[], docId: string): string | null => {
  const group = groups.find((g) => g.docs.some((d) => d.id === docId))
  return group?.tag ?? null
}

type GroupState = "collapsed" | "previewed" | "expanded"

const getGroupState = (tag: string, expandedTag: string | null, previewedTag: string | null, isSearching: boolean): GroupState => {
  if (isSearching || expandedTag === tag) return "expanded"
  if (previewedTag === tag) return "previewed"
  return "collapsed"
}

const previewDocs = (docs: ListItem[], selectedId: string | undefined): ListItem[] => {
  if (docs.length <= 2) return docs
  const selected = docs.find((d) => d.id === selectedId)
  return selected ? [selected] : [docs[0]]
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
  const isSearching = searchValue.length > 0

  const allGroups = useMemo(() => groupByTag(documents), [documents])
  const groups = useMemo(() => filterGroups(allGroups, searchValue), [allGroups, searchValue])
  const previewedTag = useMemo(
    () => selectedId ? findTagForDoc(allGroups, selectedId) : null,
    [allGroups, selectedId]
  )

  const [expandedTag, setExpandedTag] = useState<string | null>(null)

  const handleToggle = (tag: string) =>
    setExpandedTag((prev) => (prev === tag ? null : tag))

  return (
    <div className="flex h-full w-72 flex-none flex-col items-start gap-4 bg-default-background px-4 py-6">

      <div className="flex w-full items-center justify-between">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Documents
        </span>
        <Button
          variant="brand-primary"
          size="small"
          icon={<FeatherPlus />}
          onClick={onNewDocument}
        >
          New
        </Button>
      </div>

      <TextField
        className="h-auto w-full flex-none"
        variant="filled"
        label=""
        helpText=""
        icon={<FeatherSearch />}
      >
        <TextField.Input
          placeholder="Search tags & files..."
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      </TextField>

      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-3 pt-2 pb-6 overflow-y-auto">
        {groups.map(({ tag, docs }) => {
          const state = getGroupState(tag, expandedTag, previewedTag, isSearching)
          const isOpen = state !== "collapsed"
          const visibleDocs = state === "previewed" ? previewDocs(docs, selectedId) : docs
          const hasMore = state === "previewed" && visibleDocs.length < docs.length
          const color = resolveTagColor(tagColors, tag)
          return (
            <div
              key={tag}
              style={{
                '--tag-border': subtleBorder(color),
                '--tag-border-strong': hoveredElementBorder(color),
                '--tag-subtle': subtleBackground(color),
              } as React.CSSProperties}
              className={`flex w-full flex-none flex-col items-start overflow-hidden rounded-md border border-solid bg-default-background ${
                isOpen
                  ? "border-[var(--tag-border-strong)] shadow-sm"
                  : "border-neutral-border transition-colors hover:border-[var(--tag-border)]"
              }`}
            >
              <TagGroupHeader
                tag={tag}
                count={docs.length}
                expanded={isOpen}
                color={color}
                onClick={() => handleToggle(tag)}
              />
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="flex w-full flex-col items-start overflow-hidden"
                  >
                    <div className="group flex w-full flex-col items-start">
                      <AnimatePresence initial={false}>
                        {visibleDocs.map((doc) => (
                          <motion.div
                            key={doc.id}
                            className="w-full"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          >
                            <DocumentItem
                              title={doc.title}
                              editedAt={doc.editedAt}
                              color={color}
                              selected={doc.id === selectedId}
                              onClick={() => onDocumentSelect?.(doc.id)}
                            />
                          </motion.div>
                        ))}
                        {hasMore && (
                          <motion.div
                            key="more"
                            className="w-full"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 35 }}
                          >
                            <div
                              className="flex w-full items-center justify-center px-3 py-1 cursor-pointer hover:bg-[var(--tag-subtle)]"
                              onClick={() => setExpandedTag(tag)}
                            >
                              <span className="text-body-bold font-body-bold text-subtext-color">...</span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
