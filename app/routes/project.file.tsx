import { useEffect } from "react"
import { useParams } from "react-router"
import { useProject } from "./project"
import { Editor } from "~/lib/editor"
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

  const document = fileId ? project?.documents[fileId] : undefined

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
          <Editor key={fileId} content={document.content} />
        </div>
      </div>
    </>
  )
}
