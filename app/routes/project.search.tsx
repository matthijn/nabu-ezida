import { useState, useMemo, useCallback, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router"
import { useProject } from "./project"
import { useSearchResults } from "~/ui/hooks/useSearchResults"
import { SearchHeader } from "~/ui/components/search/SearchHeader"
import { SearchResultList } from "~/ui/components/search/SearchResultList"
import { StickyStatusPill } from "~/ui/components/StickyStatusPill"
import type { SearchHit } from "~/domain/search"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { formatDebugSql } from "~/lib/search"
import type { HydeQuery } from "~/lib/search/semantic"

const collectUniqueFiles = (hits: SearchHit[]): string[] => [...new Set(hits.map((h) => h.file))]

const collectTagIds = (files: string[], getFileTags: (filename: string) => string[]): string[] => [
  ...new Set(files.flatMap(getFileTags)),
]

const resolveTagDefinitions = (tagIds: string[], definitions: TagDefinition[]): TagDefinition[] =>
  tagIds
    .map((id) => definitions.find((d) => d.id === id))
    .filter((t): t is TagDefinition => t !== undefined)

const toggleActive = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set)
  if (next.has(id)) {
    if (next.size <= 1) return set
    next.delete(id)
  } else {
    next.add(id)
  }
  return next
}

const isUntagged = (fileTags: string[]): boolean => fileTags.length === 0

const hasAnyActiveTag = (fileTags: string[], active: Set<string>): boolean =>
  fileTags.some((t) => active.has(t))

const filterHitsByTags = (
  hits: SearchHit[],
  activeTags: Set<string>,
  getFileTags: (filename: string) => string[]
): SearchHit[] =>
  activeTags.size === 0
    ? hits
    : hits.filter((h) => {
        const tags = getFileTags(h.file)
        return isUntagged(tags) || hasAnyActiveTag(tags, activeTags)
      })

const groupHydesByLanguage = (hydes: HydeQuery[]): Map<string, string[]> => {
  const map = new Map<string, string[]>()
  for (const hyde of hydes) {
    const existing = map.get(hyde.language) ?? []
    existing.push(hyde.text)
    map.set(hyde.language, existing)
  }
  return map
}

const formatHydeDebug = (hydes: HydeQuery[]): string => {
  const grouped = groupHydesByLanguage(hydes)
  return [...grouped.entries()]
    .map(([lang, texts]) => `[${lang}]\n${texts.map((t, i) => `  ${i + 1}. ${t}`).join("\n")}`)
    .join("\n")
}

const countUniqueFiles = (hits: SearchHit[]): number => new Set(hits.map((h) => h.file)).size

export default function ProjectSearch() {
  const params = useParams<{ projectId: string; searchId: string }>()
  const navigate = useNavigate()
  const { files, debugOptions, getFileTags, tagDefinitions } = useProject()
  const [revision, _setRevision] = useState(0)
  const { search, results, hydes, phase, error, hasMore, loadMore } = useSearchResults(
    params.searchId ?? "",
    revision
  )
  const tagOptions = useMemo(() => {
    const uniqueFiles = collectUniqueFiles(results)
    const tagIds = collectTagIds(uniqueFiles, getFileTags)
    return resolveTagDefinitions(tagIds, tagDefinitions)
  }, [results, getFileTags, tagDefinitions])

  const allTagIds = useMemo(() => new Set(tagOptions.map((t) => t.id)), [tagOptions])
  const [activeTags, setActiveTags] = useState<Set<string>>(allTagIds)

  useEffect(() => {
    setActiveTags(allTagIds)
  }, [allTagIds])

  const handleToggleTag = useCallback(
    (id: string) => setActiveTags((prev) => toggleActive(prev, id)),
    []
  )

  const filteredResults = useMemo(
    () => filterHitsByTags(results, activeTags, getFileTags),
    [results, activeTags, getFileTags]
  )

  const isFiltering = phase === "filtering"
  const isDone = phase === "done"
  const fileCount = useMemo(() => countUniqueFiles(filteredResults), [filteredResults])

  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const didTriggerRef = useRef(false)

  useEffect(() => {
    if (!isFiltering) didTriggerRef.current = false
  }, [isFiltering])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !didTriggerRef.current) {
          didTriggerRef.current = true
          loadMore()
        }
      },
      { threshold: 0 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadMore])

  const showDebugSql = !!debugOptions.renderAsJson

  if (!params.projectId || !params.searchId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-subtext-color">Invalid search URL</span>
      </div>
    )
  }

  if (phase === "searching") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-subtext-color">Searching...</span>
      </div>
    )
  }

  if (!search) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-subtext-color">Search not found</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-error-600">{error}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-neutral-100 p-2">
      <div className="flex-1 overflow-auto rounded-xl bg-default-background px-12 pt-8">
        <div className="flex w-full max-w-[1024px] flex-col items-start gap-6">
          <SearchHeader
            title={search.title}
            description={search.description}
            tags={tagOptions}
            activeTags={activeTags}
            onToggleTag={handleToggleTag}
          />
          {showDebugSql && (
            <div className="flex w-full flex-col gap-2">
              <pre className="w-full rounded-md bg-neutral-100 px-4 py-3 text-caption font-caption text-subtext-color whitespace-pre-wrap break-words">
                {formatDebugSql(search.sql)}
              </pre>
              {hydes.length > 0 && (
                <pre className="w-full rounded-md bg-neutral-100 px-4 py-3 text-caption font-caption text-subtext-color whitespace-pre-wrap break-words">
                  {formatHydeDebug(hydes)}
                </pre>
              )}
            </div>
          )}
          <SearchResultList
            hits={filteredResults}
            files={files}
            projectId={params.projectId}
            sentinelRef={sentinelRef}
            onNavigate={navigate}
          />
        </div>
      </div>
      <div className="rounded-xl border border-solid border-neutral-border bg-default-background">
        <StickyStatusPill
          count={filteredResults.length}
          fileCount={fileCount}
          isFiltering={isFiltering}
          isDone={isDone}
        />
      </div>
    </div>
  )
}
