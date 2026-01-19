import { useEffect, useCallback, useRef } from "react"
import { useParams, useSearchParams } from "react-router"
import { useProject } from "./project"
import { Editor, EditorDocumentProvider, ScrollGutter, type CursorInfo } from "~/lib/editor"
import { FileHeader, EditorToolbar, SpotlightOverlay } from "~/ui/components/editor"
import { setEditorContext } from "~/lib/chat/context"
import { parseSpotlight } from "~/domain/spotlight"
import { useCommand } from "~/lib/api/useCommand"
import { documentCommands } from "~/domain/api/commands"
import { blocksToArrayWithChildren, type BlockOp } from "~/domain/document"
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
  const [searchParams] = useSearchParams()
  const { project, isConnected } = useProject()
  const { execute, executeAll } = useCommand()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<(() => CursorInfo) | null>(null)

  const spotlight = parseSpotlight(searchParams.get("spotlight"))

  const document = fileId ? project?.documents[fileId] : undefined

  useEffect(() => {
    if (!document) return
    setEditorContext(() => ({
      documentId: document.id,
      documentTitle: document.name,
      blockId: cursorRef.current?.()?.blockId ?? null,
      blockContent: cursorRef.current?.()?.blockContent ?? null,
    }))
    return () => setEditorContext(undefined)
  }, [document])

  const handleMoveBlock = useCallback(
    (blockId: string, position: string) => {
      if (!fileId) return
      execute(documentCommands.move_blocks({ document_id: fileId, block_ids: [blockId], position }))
    },
    [fileId, execute]
  )

  const handleScrollTo = useCallback((percent: number) => {
    const container = scrollContainerRef.current
    if (!container) return
    const maxScroll = container.scrollHeight - container.clientHeight
    const targetScroll = (percent / 100) * maxScroll
    container.scrollTo({ top: targetScroll, behavior: "smooth" })
  }, [])

  const handleSyncBlocks = useCallback(
    (ops: BlockOp[]) => {
      if (!fileId || ops.length === 0) return

      const removes = ops.filter((op): op is BlockOp & { type: "remove" } => op.type === "remove")
      const replaces = ops.filter((op): op is BlockOp & { type: "replace" } => op.type === "replace")
      const adds = ops.filter((op): op is BlockOp & { type: "add" } => op.type === "add")

      const addsByPosition = adds.reduce((acc, op) => {
        const pos = op.afterId ?? "head"
        const existing = acc.get(pos) ?? []
        acc.set(pos, [...existing, op])
        return acc
      }, new Map<string, typeof adds>())

      const commands = [
        ...(removes.length > 0 ? [documentCommands.delete_blocks({
          document_id: fileId,
          block_ids: removes.map(op => op.id),
        })] : []),
        ...replaces.map(op => documentCommands.update_block({
          document_id: fileId,
          block_id: op.block.id!,
          type: op.block.type,
          props: op.block.props,
          content: op.block.content,
        })),
        ...[...addsByPosition.entries()].map(([position, ops]) => documentCommands.insert_blocks({
          document_id: fileId,
          position,
          blocks: ops.map(op => op.block),
        })),
      ]

      executeAll(commands)
    },
    [fileId, executeAll]
  )

  const content = document ? blocksToArrayWithChildren(document) : []

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
            <SpotlightOverlay spotlight={spotlight} containerRef={editorContainerRef} />
            <EditorDocumentProvider documentId={document.id} documentName={document.name}>
              <Editor key={fileId} content={content} annotations={Object.values(document.annotations)} onMoveBlock={handleMoveBlock} onSyncBlocks={handleSyncBlocks} cursorRef={cursorRef} />
            </EditorDocumentProvider>
          </div>
        </div>
        <ScrollGutter contentRef={editorContainerRef} scrollContainerRef={scrollContainerRef} onScrollTo={handleScrollTo} />
      </div>
    </>
  )
}
