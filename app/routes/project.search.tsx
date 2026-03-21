import { useState, useMemo, useCallback } from "react"
import { useParams, useNavigate } from "react-router"
import { useProject } from "./project"
import { useSearchResults } from "~/ui/hooks/useSearchResults"
import { SearchHeader } from "~/ui/components/search/SearchHeader"
import { SearchResultList } from "~/ui/components/search/SearchResultList"
import type { SearchHit } from "~/domain/search"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"

const collectUniqueFiles = (hits: SearchHit[]): string[] => [...new Set(hits.map((h) => h.file))]

const collectTagIds = (files: string[], getFileTags: (filename: string) => string[]): string[] => [
  ...new Set(files.flatMap(getFileTags)),
]

const resolveTagOptions = (
  tagIds: string[],
  definitions: TagDefinition[]
): { id: string; label: string }[] =>
  tagIds
    .map((id) => {
      const def = definitions.find((d) => d.id === id)
      return def ? { id: def.id, label: def.display } : null
    })
    .filter((t): t is { id: string; label: string } => t !== null)

const toggleInSet = (set: Set<string>, id: string): Set<string> => {
  const next = new Set(set)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

const hasAllTags = (fileTags: string[], required: Set<string>): boolean => {
  for (const tag of required) {
    if (!fileTags.includes(tag)) return false
  }
  return true
}

const filterHitsByTags = (
  hits: SearchHit[],
  activeTags: Set<string>,
  getFileTags: (filename: string) => string[]
): SearchHit[] =>
  activeTags.size === 0 ? hits : hits.filter((h) => hasAllTags(getFileTags(h.file), activeTags))

export default function ProjectSearch() {
  const params = useParams<{ projectId: string; searchId: string }>()
  const navigate = useNavigate()
  const { files, debugOptions, getFileTags, tagDefinitions } = useProject()
  const { search, results, isLoading, error } = useSearchResults(params.searchId ?? "")
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set())

  const tagOptions = useMemo(() => {
    const uniqueFiles = collectUniqueFiles(results)
    const tagIds = collectTagIds(uniqueFiles, getFileTags)
    return resolveTagOptions(tagIds, tagDefinitions)
  }, [results, getFileTags, tagDefinitions])

  const handleToggleTag = useCallback(
    (id: string) => setActiveTags((prev) => toggleInSet(prev, id)),
    []
  )

  const filteredResults = useMemo(
    () => filterHitsByTags(results, activeTags, getFileTags),
    [results, activeTags, getFileTags]
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

  const showQueries = !!debugOptions.renderAsJson

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
        {showQueries && (
          <pre className="w-full rounded-md bg-neutral-100 px-4 py-3 text-caption font-caption text-subtext-color overflow-x-auto">
            {JSON.stringify(search.queries, null, 2)}
          </pre>
        )}
        <SearchResultList
          hits={filteredResults}
          highlights={search.highlights}
          files={files}
          projectId={params.projectId}
          onNavigate={navigate}
        />
      </div>
    </div>
  )
}
