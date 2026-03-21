import { useCallback, useMemo, useRef } from "react"
import { useSearchParams } from "react-router"
import { useScrollToEntity } from "~/ui/hooks/useScrollToEntity"
import { parseSpotlight } from "~/lib/editor/spotlight"
import { useProject } from "./project"
import { linkifyEntityIds } from "~/lib/markdown/linkify/entities"
import { linkifyTags } from "~/lib/markdown/linkify/tags"
import { toExtraPretty } from "~/lib/patch/resolve/json-expand"
import { findTagDefinitionByLabel } from "~/domain/data-blocks/settings/tags/selectors"
import { resolveEntityName } from "~/lib/files/selectors"
import { toDisplayName } from "~/lib/files/filename"
import { resolveFeatherIcon } from "~/ui/theme/feather-map"
import { MilkdownEditor } from "~/ui/components/editor/MilkdownEditor"
import { ScrollGutter } from "~/ui/components/editor/ScrollGutter"
import { FileHeader, EditorToolbar } from "~/ui/components/editor"
import {
  FeatherBold,
  FeatherCode2,
  FeatherCopy,
  FeatherFileText,
  FeatherHeading1,
  FeatherHeading2,
  FeatherHeading3,
  FeatherImage,
  FeatherItalic,
  FeatherLink,
  FeatherList,
  FeatherListChecks,
  FeatherListOrdered,
  FeatherQuote,
  FeatherStrikethrough,
  FeatherTrash,
  FeatherUnderline,
} from "@subframe/core"

const getFileRaw = (files: Record<string, string>, filename: string): string | undefined =>
  files[filename]

const isJsonFile = (filename: string): boolean => filename.endsWith(".json")

const wrapAsCodeBlock = (content: string, lang: string): string =>
  `\`\`\`${lang}\n${content}\n\`\`\``

const formatContent = (content: string, filename: string): string =>
  isJsonFile(filename) ? wrapAsCodeBlock(content, "json") : content

export default function ProjectFile() {
  const { files, currentFile, debugOptions, getFileTags, tagDefinitions } = useProject()
  const [searchParams] = useSearchParams()
  const spotlight = useMemo(() => parseSpotlight(searchParams.get("spotlight")), [searchParams])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  useScrollToEntity(editorContainerRef)

  const rawContent = currentFile ? getFileRaw(files, currentFile) : undefined
  const content = useMemo(() => {
    if (!rawContent || !currentFile) return rawContent
    if (isJsonFile(currentFile)) return rawContent
    if (debugOptions.renderAsJson) return toExtraPretty(rawContent)
    const withEntities = linkifyEntityIds(rawContent, (id) => resolveEntityName(files, id))
    return linkifyTags(withEntities, (label) => {
      const def = findTagDefinitionByLabel(files, label)
      return def ? { id: def.id, display: def.display } : null
    })
  }, [rawContent, currentFile, debugOptions.renderAsJson, files])
  const copyRawMarkdown = useCallback(() => {
    if (rawContent) navigator.clipboard.writeText(rawContent)
  }, [rawContent])
  const tagDefMap = useMemo(() => new Map(tagDefinitions.map((d) => [d.id, d])), [tagDefinitions])
  const tags = currentFile
    ? getFileTags(currentFile).map((tagId) => {
        const def = tagDefMap.get(tagId)
        return def
          ? {
              label: def.display,
              variant: "brand" as const,
              color: def.color,
              icon: resolveFeatherIcon(def.icon),
            }
          : { label: tagId, variant: "neutral" as const }
      })
    : []

  const handleScrollTo = useCallback((percent: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    const maxScroll = container.scrollHeight - container.clientHeight
    const targetScroll = (percent / 100) * maxScroll
    container.scrollTo({ top: targetScroll, behavior: "smooth" })
  }, [])

  if (!currentFile || content === undefined) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-subtext-color">Select a file</div>
      </div>
    )
  }

  return (
    <>
      <FileHeader
        title={toDisplayName(currentFile)}
        tags={tags}
        pinned={false}
        onPin={() => undefined}
        onShare={() => undefined}
        onCopyRaw={copyRawMarkdown}
        menuItems={[
          { icon: <FeatherCopy />, label: "Duplicate", onClick: () => undefined },
          { icon: <FeatherFileText />, label: "Export", onClick: () => undefined },
          { icon: <FeatherTrash />, label: "Delete", onClick: () => undefined },
        ]}
        onAddTag={() => undefined}
      />
      <div className="flex w-full grow shrink basis-0 min-h-0 items-stretch overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto"
        >
          <EditorToolbar
            groups={[
              [
                { icon: <FeatherHeading1 /> },
                { icon: <FeatherHeading2 /> },
                { icon: <FeatherHeading3 /> },
              ],
              [
                { icon: <FeatherBold /> },
                { icon: <FeatherItalic /> },
                { icon: <FeatherUnderline /> },
                { icon: <FeatherStrikethrough /> },
              ],
              [{ icon: <FeatherLink /> }, { icon: <FeatherImage /> }],
              [
                { icon: <FeatherList /> },
                { icon: <FeatherListOrdered /> },
                { icon: <FeatherListChecks /> },
              ],
              [{ icon: <FeatherCode2 /> }, { icon: <FeatherQuote /> }],
            ]}
          />
          <div
            ref={editorContainerRef}
            className="relative flex w-full grow flex-col items-start gap-8 pt-8"
          >
            <MilkdownEditor
              key={`${currentFile}-${debugOptions.renderAsJson}`}
              content={formatContent(content, currentFile)}
              debugMode={debugOptions.renderAsJson}
              spotlight={spotlight}
            />
          </div>
        </div>
        <ScrollGutter
          contentRef={editorContainerRef}
          scrollContainerRef={scrollContainerRef}
          onScrollTo={handleScrollTo}
        />
      </div>
    </>
  )
}
