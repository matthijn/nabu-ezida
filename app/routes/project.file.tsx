import { useEffect, useCallback } from "react"
import { useParams } from "react-router"
import { useProject } from "./project"
import { Editor, EditorDocumentProvider } from "~/lib/editor"
import { FileHeader, EditorToolbar } from "~/ui/components/editor"
import { useCommand } from "~/lib/api/useCommand"
import { documentCommands } from "~/domain/api/commands"
import type { BlockOp } from "~/domain/document"
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
  const { execute, executeAll } = useCommand()

  const document = fileId ? project?.documents[fileId] : undefined

  const handleMoveBlock = useCallback(
    (blockId: string, position: string) => {
      if (!fileId) return
      execute(documentCommands.move_blocks({ document_id: fileId, block_ids: [blockId], position }))
    },
    [fileId, execute]
  )

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
        ...(replaces.length > 0 ? [documentCommands.replace_blocks({
          document_id: fileId,
          block_ids: replaces.map(op => op.block.id!),
          blocks: replaces.map(op => op.block),
        })] : []),
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

  useEffect(() => {
    if (document) {
      console.debug("[WebSocket] Document content:", document.content)
    }
  }, [document?.content])

  if (!isConnected) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-subtext-color">Loading...</div>
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-subtext-color">File not found</div>
      </div>
    )
  }

  return (
    <>
      <FileHeader
        title={document.name}
        tags={document.tags.map((tag: string, i: number) => ({
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
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start pl-12 pr-6 py-6 overflow-auto">
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
        <div className="flex w-full flex-col items-start gap-8 pt-8">
          <EditorDocumentProvider documentId={document.id} documentName={document.name}>
            <Editor key={fileId} content={document.content} onMoveBlock={handleMoveBlock} onSyncBlocks={handleSyncBlocks} />
          </EditorDocumentProvider>
        </div>
      </div>
    </>
  )
}
