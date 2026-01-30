import { useState, useEffect, useCallback } from "react"
import { Outlet, useNavigate, useParams, useOutletContext } from "react-router"
import { DefaultPageLayout, type ActiveNav } from "~/ui/layouts/DefaultPageLayout"
import { useFiles } from "~/hooks/useFiles"
import { useFileImport } from "~/hooks/useFileImport"
import { DocumentsSidebar } from "~/ui/custom/sidebar/documents/DocumentsSidebar"
import { CodesSidebar, type Code } from "~/ui/custom/sidebar/codes"
import { closeChat } from "~/lib/chat"
import { NabuProvider, NabuChatSidebar } from "~/ui/components/nabu"
import { FileDropOverlay } from "~/ui/components/import"
import { buildSpotlightUrl } from "~/domain/spotlight/url"
import { createWebSocket, applyCommand } from "~/lib/sync"

type SidebarDocument = {
  id: string
  title: string
  editedAt: string
  tags: { label: string; variant: "brand" | "neutral" }[]
  pinned: boolean
  lineCount: number
}

const isHiddenFile = (filename: string): boolean =>
  filename.includes(".hidden.")

const filesToSidebarDocuments = (
  files: Record<string, string>,
  getFileTags: (filename: string) => string[],
  getFileLineCount: (filename: string) => number,
  debugMode: boolean
): SidebarDocument[] =>
  Object.keys(files)
    .filter((filename) => debugMode || !isHiddenFile(filename))
    .map((filename) => ({
    id: filename,
    title: filename,
    editedAt: "just now",
    tags: getFileTags(filename).map((tag, i) => ({ label: tag, variant: i === 0 ? "brand" as const : "neutral" as const })),
    pinned: false,
    lineCount: getFileLineCount(filename),
  }))

export type DebugOptions = {
  expanded: boolean
  persistToServer: boolean
  renderAsJson: boolean
}

export type ProjectContextValue = {
  files: Record<string, string>
  currentFile: string | null
  debugOptions: DebugOptions
  toggleDebugExpanded: () => void
  togglePersistToServer: () => void
  toggleRenderAsJson: () => void
  getFileTags: (filename: string) => string[]
  getFileAnnotations: (filename: string) => { text: string; color: string; reason?: string; code?: string }[] | undefined
}

export const useProject = () => useOutletContext<ProjectContextValue>()

export default function ProjectLayout() {
  const params = useParams<{ projectId: string; fileId?: string }>()
  const navigate = useNavigate()
  const [activeNav, setActiveNav] = useState<ActiveNav>("documents")
  const [searchValue, setSearchValue] = useState("")
  const [sortBy, setSortBy] = useState<"modified" | "name">("modified")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [debugExpanded, setDebugExpanded] = useState(false)
  const [persistToServer, setPersistToServer] = useState(true)
  const [renderAsJson, setRenderAsJson] = useState(false)

  const debugOptions: DebugOptions = { expanded: debugExpanded, persistToServer, renderAsJson }
  const toggleDebugExpanded = useCallback(() => setDebugExpanded((prev) => !prev), [])
  const togglePersistToServer = useCallback(() => setPersistToServer((prev) => !prev), [])
  const toggleRenderAsJson = useCallback(() => setRenderAsJson((prev) => !prev), [])

  useEffect(() => {
    return () => closeChat()
  }, [params.projectId])

  useEffect(() => {
    if (!params.projectId) return

    const connection = createWebSocket(params.projectId, {
      onCommand: applyCommand,
    })

    return () => connection.close()
  }, [params.projectId])

  const { files, currentFile, codebook, setCurrentFile, getFileTags, getFileLineCount, getFileAnnotations } = useFiles()
  const fileImport = useFileImport(params.projectId)

  const documents = filesToSidebarDocuments(files, getFileTags, getFileLineCount, debugExpanded)

  const handleDocumentSelect = (filename: string) => {
    setCurrentFile(filename)
    navigate(`/project/${params.projectId}/file/${encodeURIComponent(filename)}`)
  }

  const handleEditCode = (code: Code) => {
    if (!params.projectId) return
    navigate(buildSpotlightUrl(params.projectId, "codebook", [code.name]))
  }

  const renderSidebar = () => {
    if (activeNav === "codes" && codebook) {
      return (
        <CodesSidebar
          codebook={codebook}
          collapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(true)}
          onExpand={() => setSidebarCollapsed(false)}
          onEditCode={handleEditCode}
        />
      )
    }
    return (
      <DocumentsSidebar
        documents={documents}
        selectedId={currentFile ?? undefined}
        searchValue={searchValue}
        sortBy={sortBy}
        collapsed={sidebarCollapsed}
        debugMode={debugExpanded}
        onSearchChange={setSearchValue}
        onSortChange={setSortBy}
        onDocumentSelect={handleDocumentSelect}
        onNewDocument={() => {}}
        onCollapse={() => setSidebarCollapsed(true)}
        onExpand={() => setSidebarCollapsed(false)}
      />
    )
  }

  return (
    <NabuProvider>
      <div {...fileImport.dragHandlers} className="contents">
        <DefaultPageLayout
          activeNav={activeNav}
          showCodes={!!codebook}
          onNavChange={setActiveNav}
        >
          <div className="flex h-full w-full items-start bg-default-background">
            {renderSidebar()}
            <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
              <Outlet context={{ files, currentFile, debugOptions, toggleDebugExpanded, togglePersistToServer, toggleRenderAsJson, getFileTags, getFileAnnotations }} />
            </div>
          </div>
          <NabuChatSidebar />
        </DefaultPageLayout>
        <FileDropOverlay
          isVisible={fileImport.isVisible}
          isDragging={fileImport.isDragging}
          files={fileImport.files}
          progress={fileImport.progress}
          isProcessing={fileImport.isProcessing}
          dragHandlers={fileImport.dragHandlers}
          onDismiss={fileImport.dismiss}
        />
      </div>
    </NabuProvider>
  )
}
