"use client"

import { useState, useEffect, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherSearch, FeatherPlus } from "@subframe/core"
import { TextField } from "~/ui/components/TextField"
import { Button } from "~/ui/components/Button"
import { matchesAny } from "~/lib/filter"
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
  onSearchChange?: (value: string) => void
  onDocumentSelect?: (id: string) => void
  onNewDocument?: () => void
}

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

export function DocumentsSidebar({
  documents,
  selectedId,
  searchValue = "",
  onSearchChange,
  onDocumentSelect,
  onNewDocument,
}: DocumentsSidebarProps) {
  const isSearching = searchValue.length > 0

  const allGroups = useMemo(() => groupByTag(documents), [documents])
  const groups = useMemo(() => filterGroups(allGroups, searchValue), [allGroups, searchValue])

  const [expandedTag, setExpandedTag] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedId || isSearching) return
    const tag = findTagForDoc(allGroups, selectedId)
    if (tag && tag !== expandedTag) setExpandedTag(tag)
  }, [selectedId])

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
          const isExpanded = isSearching || expandedTag === tag
          return (
            <div
              key={tag}
              className={`flex w-full flex-none flex-col items-start overflow-hidden rounded-md border border-solid bg-default-background ${
                isExpanded ? "border-brand-300 shadow-sm" : "border-neutral-border transition-colors hover:border-neutral-300"
              }`}
            >
              <TagGroupHeader
                tag={tag}
                count={docs.length}
                expanded={isExpanded}
                onClick={() => handleToggle(tag)}
              />
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                    className="flex w-full flex-col items-start overflow-hidden"
                  >
                    <div className="flex w-full flex-col items-start py-1">
                      {docs.map((doc) => (
                        <DocumentItem
                          key={doc.id}
                          title={doc.title}
                          editedAt={doc.editedAt}
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
        })}
      </div>
    </div>
  )
}
