import { useCallback, useRef, useState } from "react"
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

type FileEntry = { raw: string }

const getFileRaw = (files: Record<string, unknown>, filename: string): string | undefined => {
  const entry = files[filename] as FileEntry | undefined
  return entry?.raw
}

const isJsonFile = (filename: string): boolean => filename.endsWith(".json")

const wrapAsCodeBlock = (content: string, lang: string): string =>
  `\`\`\`${lang}\n${content}\n\`\`\``

const formatContent = (content: string, filename: string): string =>
  isJsonFile(filename) ? wrapAsCodeBlock(content, "json") : content

export default function ProjectFile() {
  const { files, currentFile, getFileTags, getFileAnnotations } = useProject()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const editorContainerRef = useRef<HTMLDivElement>(null)
  const [debugMode, setDebugMode] = useState(false)

  const toggleDebugMode = useCallback(() => setDebugMode((prev) => !prev), [])

  const content = currentFile ? getFileRaw(files, currentFile) : undefined
  const copyRawMarkdown = useCallback(() => {
    if (content) navigator.clipboard.writeText(content)
  }, [content])
  const annotations = currentFile ? getFileAnnotations(currentFile) ?? [] : []
  const tags = currentFile ? getFileTags(currentFile).map((tag, i) => ({ label: tag, variant: (i === 0 ? "brand" : "neutral") as "brand" | "neutral" })) : []

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
        title={currentFile}
        tags={tags}
        pinned={false}
        debugMode={debugMode}
        onPin={() => {}}
        onShare={() => {}}
        onDebug={toggleDebugMode}
        onCopyRaw={copyRawMarkdown}
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
            <MilkdownEditor key={`${currentFile}-${debugMode}`} content={formatContent(content, currentFile)} annotations={annotations} debugMode={debugMode} />
          </div>
        </div>
        <ScrollGutter contentRef={editorContainerRef} scrollContainerRef={scrollContainerRef} onScrollTo={handleScrollTo} />
      </div>
    </>
  )
}
