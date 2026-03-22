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
import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import { toDisplayName } from "~/lib/files/filename"
import { extractFileIntro, extractSnippetAroundId, extractSnippetAroundText } from "~/lib/search"
import { getTags } from "~/domain/data-blocks/attributes/tags/selectors"
import { findTagDefinitionById } from "~/domain/data-blocks/settings/tags/selectors"

interface FileGroup {
  file: string
  hits: SearchHit[]
}

const FILES_PER_PAGE = 10

const groupByFile = (hits: SearchHit[]): FileGroup[] => {
  const map = new Map<string, SearchHit[]>()
  for (const hit of hits) {
    const existing = map.get(hit.file)
    if (existing) existing.push(hit)
    else map.set(hit.file, [hit])
  }
  return [...map.entries()].map(([file, fileHits]) => ({ file, hits: fileHits }))
}

const hitHasId = (hit: SearchHit): hit is SearchHit & { id: string } => hit.id !== undefined
const hitHasText = (hit: SearchHit): hit is SearchHit & { text: string } => hit.text !== undefined
const hitIsFileOnly = (hit: SearchHit): boolean => !hitHasId(hit) && !hitHasText(hit)

interface SearchResultListProps {
  hits: SearchHit[]
  files: FileStore
  projectId: string
  onNavigate?: (url: string) => void
}

const FileHitSnippet = ({ file, id, files }: { file: string; id: string; files: FileStore }) => {
  const snippet = useMemo(() => {
    const content = files[file]
    if (!content) return null
    return extractSnippetAroundId(content, id)
  }, [file, id, files])

  if (!snippet) return null

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
      <span className="text-caption font-caption text-subtext-color">Line {snippet.line}</span>
      <pre className="text-monospace-body font-monospace-body text-default-font whitespace-pre-wrap break-words w-full">
        {snippet.text}
      </pre>
    </div>
  )
}

const TextSnippet = ({ file, text, files }: { file: string; text: string; files: FileStore }) => {
  const snippet = useMemo(() => {
    const content = files[file]
    if (!content) return null
    return extractSnippetAroundText(content, text)
  }, [file, text, files])

  if (!snippet) {
    return (
      <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
        <pre className="text-monospace-body font-monospace-body text-default-font whitespace-pre-wrap break-words w-full">
          {text.slice(0, 300)}
        </pre>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
      {snippet.line > 0 && (
        <span className="text-caption font-caption text-subtext-color">Line {snippet.line}</span>
      )}
      <pre className="text-monospace-body font-monospace-body text-default-font whitespace-pre-wrap break-words w-full">
        {snippet.text}
      </pre>
    </div>
  )
}

const FileIntroSnippet = ({ file, files }: { file: string; files: FileStore }) => {
  const intro = useMemo(() => {
    const content = files[file]
    if (!content) return null
    return extractFileIntro(content)
  }, [file, files])

  if (!intro) return null

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
      <span className="text-body font-body text-default-font line-clamp-3">{intro}</span>
    </div>
  )
}

const renderHit = (hit: SearchHit, index: number, files: FileStore) => {
  if (hitHasText(hit)) {
    return <TextSnippet key={`text-${index}`} file={hit.file} text={hit.text} files={files} />
  }
  if (hitHasId(hit)) {
    return <FileHitSnippet key={hit.id} file={hit.file} id={hit.id} files={files} />
  }
  return <FileIntroSnippet key={`file-${index}`} file={hit.file} files={files} />
}

const FileGroupCard = ({
  group,
  files,
  projectId,
  onNavigate,
}: {
  group: FileGroup
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
        {isFileOnlyGroup ? (
          <FileIntroSnippet file={group.file} files={files} />
        ) : (
          detailHits.map((hit, i) => renderHit(hit, i, files))
        )}
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
  const groups = useMemo(() => groupByFile(hits), [hits])
  const totalPages = Math.max(1, Math.ceil(groups.length / FILES_PER_PAGE))
  const page = clampPage(parsePage(searchParams.get("page")), totalPages)

  const visibleGroups = useMemo(
    () => groups.slice((page - 1) * FILES_PER_PAGE, page * FILES_PER_PAGE),
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

  const fileCount = groups.length

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2">
        <span className="text-body-bold font-body-bold text-default-font">
          {hits.length} {hits.length === 1 ? "result" : "results"}
        </span>
        <span className="text-body font-body text-subtext-color">
          across {fileCount} {fileCount === 1 ? "document" : "documents"}
        </span>
      </div>
      <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-200" />
      <div className="flex w-full flex-col items-start gap-6">
        {visibleGroups.map((group) => (
          <FileGroupCard
            key={group.file}
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
