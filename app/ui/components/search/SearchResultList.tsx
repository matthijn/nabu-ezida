import { useMemo } from "react"
import { FeatherFileText, FeatherExternalLink } from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { TagBadge } from "~/ui/components/TagBadge"
import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import { toDisplayName } from "~/lib/files/filename"
import { extractFileIntro, extractSnippetAroundId, expandFileHits } from "~/lib/search"
import { getTags } from "~/domain/data-blocks/attributes/tags/selectors"
import { findTagDefinitionById } from "~/domain/data-blocks/settings/tags/selectors"

interface FileGroup {
  file: string
  hits: SearchHit[]
}

const groupByFile = (hits: SearchHit[]): FileGroup[] => {
  const map = new Map<string, SearchHit[]>()
  for (const hit of hits) {
    const existing = map.get(hit.file)
    if (existing) existing.push(hit)
    else map.set(hit.file, [hit])
  }
  return [...map.entries()].map(([file, fileHits]) => ({ file, hits: fileHits }))
}

interface SearchResultListProps {
  hits: SearchHit[]
  highlights: string[]
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

const extractSnippetAroundLine = (content: string, line: number, contextLines = 2): string => {
  const lines = content.split("\n")
  const idx = line - 1
  const start = Math.max(0, idx - contextLines)
  const end = Math.min(lines.length, idx + contextLines + 1)
  return lines.slice(start, end).join("\n")
}

const TextHitSnippet = ({
  file,
  line,
  term,
  files,
}: {
  file: string
  line: number
  term: string
  files: FileStore
}) => {
  const snippet = useMemo(() => {
    const content = files[file]
    if (!content) return null
    return extractSnippetAroundLine(content, line)
  }, [file, line, files])

  if (!snippet) return null

  return (
    <div className="flex w-full flex-col items-start gap-1 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-caption font-caption text-subtext-color">Line {line}</span>
        <span className="rounded bg-brand-100 px-1.5 py-0.5 text-caption-bold font-caption-bold text-brand-700">
          {term}
        </span>
      </div>
      <pre className="text-monospace-body font-monospace-body text-default-font whitespace-pre-wrap break-words w-full">
        {snippet}
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

  const isFileOnly = group.hits.every((h) => h.type === "file")
  const detailHits = group.hits.filter((h) => h.type !== "file")
  const hitCount = detailHits.length

  const handleOpenFile = () => onNavigate?.(fileUrl)

  const renderHit = (hit: SearchHit, index: number) => {
    switch (hit.type) {
      case "file":
        return <FileIntroSnippet key={`file-${index}`} file={hit.file} files={files} />
      case "hit":
        return <FileHitSnippet key={hit.id} file={hit.file} id={hit.id} files={files} />
      case "text":
        return (
          <TextHitSnippet
            key={`${hit.line}-${hit.term}`}
            file={hit.file}
            line={hit.line}
            term={hit.term}
            files={files}
          />
        )
    }
  }

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
        {isFileOnly ? (
          <FileIntroSnippet file={group.file} files={files} />
        ) : (
          detailHits.map(renderHit)
        )}
      </div>
    </div>
  )
}

export const SearchResultList = ({
  hits,
  highlights,
  files,
  projectId,
  onNavigate,
}: SearchResultListProps) => {
  const getContent = useMemo(() => (file: string) => files[file], [files])
  const expanded = useMemo(
    () => expandFileHits(hits, highlights, getContent),
    [hits, highlights, getContent]
  )
  const groups = useMemo(() => groupByFile(expanded), [expanded])
  const fileCount = groups.length

  return (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2">
        <span className="text-body-bold font-body-bold text-default-font">
          {expanded.length} {expanded.length === 1 ? "result" : "results"}
        </span>
        <span className="text-body font-body text-subtext-color">
          across {fileCount} {fileCount === 1 ? "document" : "documents"}
        </span>
      </div>
      <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-200" />
      <div className="flex w-full flex-col items-start gap-6">
        {groups.map((group) => (
          <FileGroupCard
            key={group.file}
            group={group}
            files={files}
            projectId={projectId}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}
