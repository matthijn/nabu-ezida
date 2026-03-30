import { useMemo } from "react"
import { FeatherFileText, FeatherExternalLink } from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { TagBadge } from "~/ui/components/TagBadge"
import { MilkdownEditor } from "~/ui/components/editor/MilkdownEditor"
import type { SearchHit } from "~/domain/search"
import type { FileStore } from "~/lib/files"
import { toDisplayName } from "~/lib/files/filename"
import { extractSearchSlice } from "~/lib/search"
import { getTags } from "~/domain/data-blocks/attributes/tags/selectors"
import { findTagDefinitionById } from "~/domain/data-blocks/settings/tags/selectors"

export interface SearchResultListProps {
  hits: SearchHit[]
  files: FileStore
  projectId: string
  onNavigate?: (url: string) => void
}

interface RunGroup {
  file: string
  hits: SearchHit[]
}

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

const SearchSlicePreview = ({ hit, fileContent }: { hit: SearchHit; fileContent: string }) => {
  const markdown = useMemo(() => extractSearchSlice(hit, fileContent), [hit, fileContent])

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
        <IconButton size="small" icon={<FeatherExternalLink />} onClick={handleOpenFile} />
      </div>
      <div className="flex w-full flex-col items-start gap-4 px-6 py-5">
        {hitsToRender.map((hit, i) => (
          <SearchSlicePreview key={hitKey(hit, i)} hit={hit} fileContent={content} />
        ))}
      </div>
    </div>
  )
}

export const SearchResultList = ({ hits, files, projectId, onNavigate }: SearchResultListProps) => {
  const groups = useMemo(() => groupByRun(hits), [hits])

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {groups.map((group, i) => (
        <RunGroupCard
          key={`${group.file}-${i}`}
          group={group}
          files={files}
          projectId={projectId}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  )
}
