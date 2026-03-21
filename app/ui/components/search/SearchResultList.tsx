import { useMemo } from "react"
import { FeatherFileText, FeatherExternalLink } from "@subframe/core"
import { Badge } from "~/ui/components/Badge"
import { IconButton } from "~/ui/components/IconButton"
import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import { toDisplayName } from "~/lib/files/filename"
import { extractFileIntro, extractSnippetAroundId } from "~/lib/search"
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
  const hitCount = group.hits.length

  const handleOpenFile = () => onNavigate?.(fileUrl)

  return (
    <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
      <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
        <FeatherFileText className="text-body font-body text-brand-600" />
        <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
          {toDisplayName(group.file)}
        </span>
        {tags.map((tag) => (
          <Badge key={tag.id} variant="neutral" icon={null}>
            {tag.display}
          </Badge>
        ))}
        {!isFileOnly && (
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
          group.hits
            .filter((h): h is Extract<SearchHit, { type: "hit" }> => h.type === "hit")
            .map((hit) => <FileHitSnippet key={hit.id} file={hit.file} id={hit.id} files={files} />)
        )}
      </div>
    </div>
  )
}

export const SearchResultList = ({ hits, files, projectId, onNavigate }: SearchResultListProps) => {
  const groups = useMemo(() => groupByFile(hits), [hits])
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
