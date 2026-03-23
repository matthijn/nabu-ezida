import { useState, useMemo, useCallback, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { useProject } from "./project"
import { useSearchResults } from "~/ui/hooks/useSearchResults"
import { SearchHeader } from "~/ui/components/search/SearchHeader"
import { SearchResultList } from "~/ui/components/search/SearchResultList"
import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { extractSearchSlice, formatDebugSql } from "~/lib/search"

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

const hasAnyActiveTag = (fileTags: string[], active: Set<string>): boolean =>
  fileTags.some((t) => active.has(t))

const filterHitsByTags = (
  hits: SearchHit[],
  activeTags: Set<string>,
  getFileTags: (filename: string) => string[]
): SearchHit[] => hits.filter((h) => hasAnyActiveTag(getFileTags(h.file), activeTags))

interface DebugSlice {
  hit: SearchHit
  slice: string | null
}

const buildDebugSlices = (hits: SearchHit[], files: FileStore): DebugSlice[] =>
  hits.map((hit) => ({ hit, slice: extractSearchSlice(hit, files) }))

export default function ProjectSearch() {
  const params = useParams<{ projectId: string; searchId: string }>()
  const navigate = useNavigate()
  const { files, debugOptions, getFileTags, tagDefinitions } = useProject()
  const { search, results, isLoading, error } = useSearchResults(params.searchId ?? "")
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
  const debugSlices = useMemo(
    () => (showDebugSql ? buildDebugSlices(filteredResults, files) : []),
    [showDebugSql, filteredResults, files]
  )

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
            <details className="w-full rounded-md bg-neutral-100">
              <summary className="cursor-pointer px-4 py-2 text-caption font-caption text-subtext-color">
                Raw results ({filteredResults.length} hits)
              </summary>
              <pre className="px-4 py-3 text-caption font-caption text-subtext-color whitespace-pre-wrap break-words max-h-96 overflow-auto">
                {JSON.stringify(filteredResults, null, 2)}
              </pre>
            </details>
            <details className="w-full rounded-md bg-neutral-100">
              <summary className="cursor-pointer px-4 py-2 text-caption font-caption text-subtext-color">
                Raw slices ({debugSlices.length} hits)
              </summary>
              <div className="flex flex-col gap-3 px-4 py-3 max-h-[600px] overflow-auto">
                {debugSlices.map(({ hit, slice }, i) => (
                  <div key={hit.id ?? `slice-${i}`} className="flex flex-col gap-1">
                    <span className="text-caption font-caption text-subtext-color">
                      {hit.file}
                      {hit.id ? ` #${hit.id}` : ""}
                      {hit.text ? ` "${hit.text.slice(0, 60)}"` : ""}
                    </span>
                    <pre className="text-caption font-caption text-subtext-color whitespace-pre-wrap break-words rounded bg-neutral-200 px-3 py-2">
                      {slice ?? "(no slice)"}
                    </pre>
                  </div>
                ))}
              </div>
            </details>
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
