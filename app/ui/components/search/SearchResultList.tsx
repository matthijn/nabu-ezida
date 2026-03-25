import { useMemo, useCallback } from "react"
import { useSearchParams } from "react-router"
import {
  FeatherFileText,
  FeatherExternalLink,
  FeatherChevronLeft,
  FeatherChevronRight,
} from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { TagBadge } from "~/ui/components/TagBadge"
import { MilkdownEditor } from "~/ui/components/editor/MilkdownEditor"
import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import { toDisplayName } from "~/lib/files/filename"
import { extractSearchSlice } from "~/lib/search"
import { getTags } from "~/domain/data-blocks/attributes/tags/selectors"
import { findTagDefinitionById } from "~/domain/data-blocks/settings/tags/selectors"

interface RunGroup {
  file: string
  hits: SearchHit[]
}

const GROUPS_PER_PAGE = 10

const groupByRun = (hits: SearchHit[]): RunGroup[] => {
  const groups: RunGroup[] = []
  for (const hit of hits) {
    const last = groups[groups.length - 1]
    if (last && last.file === hit.file) last.hits.push(hit)
    else groups.push({ file: hit.file, hits: [hit] })
  }
  return groups
}

const hitHasId = (hit: SearchHit): hit is SearchHit & { id: string } => hit.id !== undefined
const hitHasText = (hit: SearchHit): hit is SearchHit & { text: string } => hit.text !== undefined
const hitIsFileOnly = (hit: SearchHit): boolean => !hitHasId(hit) && !hitHasText(hit)

const hitKey = (hit: SearchHit, index: number): string =>
  hit.id ?? (hit.text ? `text-${index}` : `file-${index}`)

interface SearchResultListProps {
  hits: SearchHit[]
  files: FileStore
  projectId: string
  onNavigate?: (url: string) => void
}

const SearchSlicePreview = ({ hit }: { hit: SearchHit }) => {
  const markdown = useMemo(() => extractSearchSlice(hit), [hit])

  if (!markdown) return null

  return (
    <div className="w-full rounded-md border border-solid border-neutral-200 px-4 py-3">
      <MilkdownEditor content={markdown} readOnly />
    </div>
  )
}

const RunGroupCard = ({
  group,
  files,
  projectId,
  onNavigate,
}: {
  group: RunGroup
  files: FileStore
  projectId: string
  onNavigate?: (url: string) => void
}) => {
  const fileUrl = `/project/${projectId}/file/${encodeURIComponent(group.file)}`
  const content = files[group.file] ?? ""
  const tagIds = getTags(content)
  const tags = tagIds
    .map((id) => findTagDefinitionById(files, id))
    .filter((t): t is NonNullable<typeof t> => t !== null)

  const isFileOnlyGroup = group.hits.every(hitIsFileOnly)
  const detailHits = group.hits.filter((h) => !hitIsFileOnly(h))
  const hitCount = detailHits.length

  const handleOpenFile = () => onNavigate?.(fileUrl)

  const hitsToRender = isFileOnlyGroup ? [{ file: group.file }] : detailHits

  return (
    <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
      <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
        <FeatherFileText className="text-body font-body text-brand-600" />
        <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
          {toDisplayName(group.file)}
        </span>
        {tags.map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
        {hitCount > 0 && (
          <span className="text-caption font-caption text-subtext-color">
            {hitCount} {hitCount === 1 ? "match" : "matches"}
          </span>
        )}
        <IconButton size="small" icon={<FeatherExternalLink />} onClick={handleOpenFile} />
      </div>
      <div className="flex w-full flex-col items-start gap-4 px-6 py-5">
        {hitsToRender.map((hit, i) => (
          <SearchSlicePreview key={hitKey(hit, i)} hit={hit} />
        ))}
      </div>
    </div>
  )
}

const parsePage = (param: string | null): number => {
  const n = parseInt(param ?? "1", 10)
  return Number.isNaN(n) || n < 1 ? 1 : n
}

const clampPage = (page: number, totalPages: number): number =>
  Math.max(1, Math.min(page, totalPages))

const PageButton = ({
  page,
  active,
  onClick,
}: {
  page: number
  active: boolean
  onClick: () => void
}) => (
  <button
    className={`flex h-8 w-8 items-center justify-center rounded text-caption font-caption ${
      active ? "bg-brand-600 text-white" : "text-subtext-color hover:bg-neutral-100"
    }`}
    onClick={onClick}
  >
    {page}
  </button>
)

const Pagination = ({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) => {
  if (totalPages <= 1) return null

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)

  return (
    <div className="flex w-full items-center justify-center gap-1">
      <IconButton
        size="small"
        icon={<FeatherChevronLeft />}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
      />
      {pages.map((p) => (
        <PageButton key={p} page={p} active={p === page} onClick={() => onPageChange(p)} />
      ))}
      <IconButton
        size="small"
        icon={<FeatherChevronRight />}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
      />
    </div>
  )
}

export const SearchResultList = ({ hits, files, projectId, onNavigate }: SearchResultListProps) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const groups = useMemo(() => groupByRun(hits), [hits])
  const totalPages = Math.max(1, Math.ceil(groups.length / GROUPS_PER_PAGE))
  const page = clampPage(parsePage(searchParams.get("page")), totalPages)

  const visibleGroups = useMemo(
    () => groups.slice((page - 1) * GROUPS_PER_PAGE, page * GROUPS_PER_PAGE),
    [groups, page]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      const clamped = clampPage(newPage, totalPages)
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (clamped <= 1) next.delete("page")
        else next.set("page", String(clamped))
        return next
      })
    },
    [totalPages, setSearchParams]
  )

  const uniqueFileCount = useMemo(() => new Set(hits.map((h) => h.file)).size, [hits])

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2">
        <span className="text-body-bold font-body-bold text-default-font">
          {hits.length} {hits.length === 1 ? "result" : "results"}
        </span>
        <span className="text-body font-body text-subtext-color">
          across {uniqueFileCount} {uniqueFileCount === 1 ? "document" : "documents"}
        </span>
      </div>
      <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-200" />
      <div className="flex w-full flex-col items-start gap-6">
        {visibleGroups.map((group, i) => (
          <RunGroupCard
            key={`${group.file}-${i}`}
            group={group}
            files={files}
            projectId={projectId}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  )
}
