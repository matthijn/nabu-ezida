import { useCallback, useRef } from "react"
import { useParams } from "react-router"
import { useProject } from "./project"
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

export default function ProjectFile() {
  const { fileId } = useParams()
  const { project, isConnected } = useProject()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)

  const document = fileId ? project?.documents[fileId] : undefined

  const handleScrollTo = useCallback((percent: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    const maxScroll = container.scrollHeight - container.clientHeight
    const targetScroll = (percent / 100) * maxScroll
    container.scrollTo({ top: targetScroll, behavior: "smooth" })
  }, [])

  if (!document) {
    const message = isConnected ? "File not found" : "Loading..."
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-subtext-color">{message}</div>
      </div>
    )
  }

  return (
    <>
      <FileHeader
        title={document.name}
        tags={Object.keys(document.tags).map((tag, i) => ({
          label: tag,
          variant: i === 0 ? "brand" : ("neutral" as const),
        }))}
        pinned={document.pinned}
        onPin={() => {}}
        onShare={() => {}}
        menuItems={[
          { icon: <FeatherCopy />, label: "Duplicate", onClick: () => {} },
          { icon: <FeatherFileText />, label: "Export", onClick: () => {} },
          { icon: <FeatherTrash />, label: "Delete", onClick: () => {} },
        ]}
        onAddTag={() => {}}
      />
      <div className="flex w-full grow shrink basis-0 min-h-0 items-stretch overflow-hidden">
        <div ref={scrollContainerRef} className="flex grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto">
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
          <div ref={editorContainerRef} className="relative flex w-full grow flex-col items-start gap-8 pt-8">
            <MilkdownEditor key={fileId} documentId={document.id} documentName={document.name} />
          </div>
        </div>
        <ScrollGutter contentRef={editorContainerRef} scrollContainerRef={scrollContainerRef} onScrollTo={handleScrollTo} />
      </div>
    </>
  )
}
