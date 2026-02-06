import { useState, useEffect, useCallback } from "react"
import { Outlet, useNavigate, useParams, useOutletContext } from "react-router"
import { DefaultPageLayout, type ActiveNav } from "~/ui/layouts/DefaultPageLayout"
import { useFiles } from "~/hooks/useFiles"
import { useFileImport } from "~/hooks/useFileImport"
import { DocumentsSidebar } from "~/ui/custom/sidebar/documents/DocumentsSidebar"
import { CodesSidebar, type Code } from "~/ui/custom/sidebar/codes"
import { closeChat } from "~/lib/chat"
import { NabuProvider, NabuChatSidebar } from "~/ui/components/nabu"
import { DebugStreamPanel } from "~/ui/components/debug"
import { FileDropOverlay } from "~/ui/components/import"
import { buildSpotlightUrl } from "~/domain/spotlight/url"
import { createWebSocket, applyCommand } from "~/lib/sync"
import { setProjectId } from "~/lib/files"
import { getAnnotationCount } from "~/lib/files/selectors"

type SidebarDocument = {
  id: string
  title: string
  editedAt: string
  tags: { label: string; variant: "brand" | "neutral" }[]
  pinned: boolean
  lineCount: number
  annotationCount: number
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
    annotationCount: getAnnotationCount(files[filename]),
  }))

export type DebugOptions = {
  expanded: boolean
  persistToServer: boolean
  renderAsJson: boolean
  showStreamPanel: boolean
}

const DEBUG_STORAGE_KEY = "nabu-debug-options"

const DEFAULT_DEBUG_OPTIONS: DebugOptions = {
  expanded: false,
  persistToServer: true,
  renderAsJson: false,
  showStreamPanel: false,
}

const loadDebugOptions = (): DebugOptions => {
  if (typeof window === "undefined") return DEFAULT_DEBUG_OPTIONS
  try {
    const stored = localStorage.getItem(DEBUG_STORAGE_KEY)
    return stored ? { ...DEFAULT_DEBUG_OPTIONS, ...JSON.parse(stored) } : DEFAULT_DEBUG_OPTIONS
  } catch {
    return DEFAULT_DEBUG_OPTIONS
  }
}

const saveDebugOptions = (options: DebugOptions): void => {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify(options))
  } catch {}
}

export type ProjectContextValue = {
  files: Record<string, string>
  currentFile: string | null
  debugOptions: DebugOptions
  toggleDebugExpanded: () => void
  togglePersistToServer: () => void
  toggleRenderAsJson: () => void
  toggleStreamPanel: () => void
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
  const [debugExpanded, setDebugExpanded] = useState(() => loadDebugOptions().expanded)
  const [persistToServer, setPersistToServer] = useState(() => loadDebugOptions().persistToServer)
  const [renderAsJson, setRenderAsJson] = useState(() => loadDebugOptions().renderAsJson)
  const [showStreamPanel, setShowStreamPanel] = useState(() => loadDebugOptions().showStreamPanel)

  const debugOptions: DebugOptions = { expanded: debugExpanded, persistToServer, renderAsJson, showStreamPanel }

  useEffect(() => {
    saveDebugOptions(debugOptions)
  }, [debugExpanded, persistToServer, renderAsJson, showStreamPanel])

  const toggleDebugExpanded = useCallback(() => setDebugExpanded((prev) => !prev), [])
  const togglePersistToServer = useCallback(() => setPersistToServer((prev) => !prev), [])
  const toggleRenderAsJson = useCallback(() => setRenderAsJson((prev) => !prev), [])
  const toggleStreamPanel = useCallback(() => setShowStreamPanel((prev) => !prev), [])

  useEffect(() => {
    return () => closeChat()
  }, [params.projectId])

  useEffect(() => {
    if (!params.projectId) return
    setProjectId(params.projectId)

    const connection = createWebSocket(params.projectId, {
      onCommand: applyCommand,
    })

    return () => {
      connection.close()
      setProjectId(null)
    }
  }, [params.projectId])

  const { files, currentFile, codebook, setCurrentFile, getFileTags, getFileLineCount, getFileAnnotations } = useFiles()
  const fileImport = useFileImport()

  const fileNames = Object.keys(files).filter((f) => debugExpanded || !isHiddenFile(f))

  useEffect(() => {
    if (!currentFile && fileNames.length > 0 && params.projectId) {
      const first = fileNames[0]
      setCurrentFile(first)
      navigate(`/project/${params.projectId}/file/${encodeURIComponent(first)}`)
    }
  }, [currentFile, fileNames.length, params.projectId])

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
              <Outlet context={{ files, currentFile, debugOptions, toggleDebugExpanded, togglePersistToServer, toggleRenderAsJson, toggleStreamPanel, getFileTags, getFileAnnotations }} />
            </div>
          </div>
          <NabuChatSidebar />
          {showStreamPanel && <DebugStreamPanel onClose={toggleStreamPanel} />}
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
