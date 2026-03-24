import { useState, useMemo, useCallback, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { useProject } from "./project"
import { useSearchResults } from "~/ui/hooks/useSearchResults"
import { SearchHeader } from "~/ui/components/search/SearchHeader"
import { SearchResultList } from "~/ui/components/search/SearchResultList"
import type { SearchHit } from "~/domain/search"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { formatDebugSql } from "~/lib/search"

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

const COSINE_KEY = "debug.search.cosine"
const BM25_KEY = "debug.search.bm25"

const readFlag = (key: string): boolean => localStorage.getItem(key) !== "false"

const toggleFlag = (key: string): boolean => {
  const next = !readFlag(key)
  localStorage.setItem(key, String(next))
  return next
}

export default function ProjectSearch() {
  const params = useParams<{ projectId: string; searchId: string }>()
  const navigate = useNavigate()
  const { files, debugOptions, getFileTags, tagDefinitions } = useProject()
  const [revision, setRevision] = useState(0)
  const { search, results, lenses, isLoading, error } = useSearchResults(
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

  const showDebugSql = !!debugOptions.renderAsJson

  if (!params.projectId || !params.searchId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-subtext-color">Invalid search URL</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-subtext-color">Loading search results...</span>
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
    <div className="flex h-full w-full flex-col items-start gap-6 overflow-auto px-12 py-8">
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
            {lenses.length > 0 && (
              <pre className="w-full rounded-md bg-neutral-100 px-4 py-3 text-caption font-caption text-subtext-color whitespace-pre-wrap break-words">
                {lenses.join("\n")}
              </pre>
            )}
            <div className="flex gap-4 text-caption font-caption text-subtext-color">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={readFlag(COSINE_KEY)}
                  onChange={() => {
                    toggleFlag(COSINE_KEY)
                    setRevision((r) => r + 1)
                  }}
                />
                Cosine
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked={readFlag(BM25_KEY)}
                  onChange={() => {
                    toggleFlag(BM25_KEY)
                    setRevision((r) => r + 1)
                  }}
                />
                BM25
              </label>
            </div>
          </div>
        )}
        <SearchResultList
          hits={filteredResults}
          files={files}
          projectId={params.projectId}
          onNavigate={navigate}
        />
      </div>
    </div>
  )
}
