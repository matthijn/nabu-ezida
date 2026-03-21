import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { Outlet, useNavigate, useParams, useOutletContext } from "react-router"
import { DefaultPageLayout, type ActiveNav } from "~/ui/layouts/DefaultPageLayout"
import { useFiles } from "~/ui/hooks/useFiles"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { useFileImport } from "~/ui/hooks/useFileImport"
import { DocumentsSidebar } from "~/ui/components/sidebar/documents/DocumentsSidebar"
import { CodesSidebar, type Code } from "~/ui/components/sidebar/codes"
import { SearchSidebar } from "~/ui/components/sidebar/search"
import {
  getSearchEntries,
  getRecentSearches,
  getSavedSearches,
  toggleSearchSaved,
  removeSearch,
} from "~/domain/data-blocks/settings/searches/selectors"
import { updateSearchEntries } from "~/lib/agent/tools/search/settings"
import { NabuProvider, NabuChatSidebar } from "~/ui/components/nabu"
import { DebugMenuButton, DebugStreamPanel } from "~/ui/components/debug"
import { FileDropOverlay } from "~/ui/components/import"
import { useNotifications } from "~/ui/hooks/useNotifications"
import { DEFAULT_DEBUG_OPTIONS, type DebugOptions } from "~/ui/components/editor/debug-config"

import { createWebSocket, applyCommand } from "~/lib/server/sync"
import { setProjectId, setPersistEnabled } from "~/lib/files"
import { startDatabase } from "~/domain/db/database"
import { getAnnotationCount } from "~/domain/data-blocks/attributes/annotations/selectors"
import { findDocumentForCallout } from "~/domain/data-blocks/callout/selectors"
import { toDisplayName, isHiddenFile } from "~/lib/files/filename"

export type { DebugOptions } from "~/ui/components/editor/debug-config"

interface SidebarDocument {
  id: string
  title: string
  editedAt: string
  tags: string[]
  annotationCount: number
}

const filesToSidebarDocuments = (
  files: Record<string, string>,
  getFileTags: (filename: string) => string[],
  debugMode: boolean
): SidebarDocument[] =>
  Object.keys(files)
    .filter((filename) => debugMode || !isHiddenFile(filename))
    .map((filename) => ({
      id: filename,
      title: toDisplayName(filename),
      editedAt: "just now",
      tags: getFileTags(filename),
      annotationCount: getAnnotationCount(files[filename] ?? ""),
    }))

const DEBUG_STORAGE_KEY = "nabu-debug-options"

const requestCompaction = (): void => {
  if (typeof window === "undefined") return
  try {
    const stored = localStorage.getItem(DEBUG_STORAGE_KEY)
    const options = stored ? JSON.parse(stored) : {}
    localStorage.setItem(DEBUG_STORAGE_KEY, JSON.stringify({ ...options, forceCompaction: true }))
  } catch (_) {
    void _
  }
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
  } catch (_) {
    void _
  }
}

export interface ProjectContextValue {
  files: Record<string, string>
  currentFile: string | null
  debugOptions: DebugOptions
  toggleDebugOption: (key: string) => void
  requestCompaction: () => void
  getFileTags: (filename: string) => string[]
  getFileAnnotations: (
    filename: string
  ) => { text: string; color: string; reason?: string; code?: string }[] | undefined
  tagDefinitions: TagDefinition[]
}

export const useProject = () => useOutletContext<ProjectContextValue>()

export default function ProjectLayout() {
  const params = useParams<{ projectId: string; fileId?: string; searchId?: string }>()
  const navigate = useNavigate()
  const dismissSidebarRef = useRef<(() => void) | null>(null)
  const [activeNav, setActiveNav] = useState<ActiveNav>("documents")
  const [searchValue, setSearchValue] = useState("")
  const [debugOptions, setDebugOptions] = useState<DebugOptions>(loadDebugOptions)
  useNotifications()

  useEffect(() => {
    saveDebugOptions(debugOptions)
  }, [debugOptions])

  useEffect(() => {
    setPersistEnabled(debugOptions.persistToServer)
  }, [debugOptions.persistToServer])

  const toggleDebugOption = useCallback(
    (key: string) => setDebugOptions((prev) => ({ ...prev, [key]: !prev[key] })),
    []
  )

  useEffect(() => {
    if (!params.projectId) return
    setProjectId(params.projectId)

    const connection = createWebSocket(params.projectId, {
      onCommand: applyCommand,
    })

    startDatabase()

    return () => {
      connection.close()
      setProjectId(null)
    }
  }, [params.projectId])

  const {
    files,
    currentFile,
    codebook,
    setCurrentFile,
    getFileTags,
    getFileAnnotations,
    tagDefinitions,
  } = useFiles()
  const fileImport = useFileImport()

  const fileNames = useMemo(
    () => Object.keys(files).filter((f) => debugOptions.expanded || !isHiddenFile(f)),
    [files, debugOptions.expanded]
  )

  useEffect(() => {
    if (params.searchId) return

    if (params.fileId) {
      const decoded = decodeURIComponent(params.fileId)
      const fileExists = decoded in files
      if (fileExists) {
        if (decoded !== currentFile) setCurrentFile(decoded)
        return
      }
    }
    if (fileNames.length > 0 && params.projectId) {
      const first = fileNames[0]
      setCurrentFile(first)
      navigate(`/project/${params.projectId}/file/${encodeURIComponent(first)}`, { replace: true })
    }
  }, [
    params.fileId,
    params.searchId,
    params.projectId,
    files,
    currentFile,
    fileNames,
    setCurrentFile,
    navigate,
  ])

  const documents = filesToSidebarDocuments(files, getFileTags, !!debugOptions.expanded)

  const handleDocumentSelect = (filename: string) => {
    setCurrentFile(filename)
    dismissSidebarRef.current?.()
    navigate(`/project/${params.projectId}/file/${encodeURIComponent(filename)}`)
  }

  const recentSearches = useMemo(() => getRecentSearches(files), [files])
  const savedSearches = useMemo(() => getSavedSearches(files), [files])

  const handleSearchSave = (id: string) => {
    const entries = getSearchEntries(files)
    updateSearchEntries(toggleSearchSaved(entries, id))
  }

  const handleSearchRemove = (id: string) => {
    const entries = getSearchEntries(files)
    updateSearchEntries(removeSearch(entries, id))
  }

  const handleSearchSelect = (id: string) => {
    dismissSidebarRef.current?.()
    navigate(`/project/${params.projectId}/search/${id}`)
  }

  const handleEditCode = (code: Code) => {
    if (!params.projectId) return
    const documentId = findDocumentForCallout(files, code.id)
    if (!documentId) return
    dismissSidebarRef.current?.()
    navigate(
      `/project/${params.projectId}/file/${encodeURIComponent(documentId)}?entity=${code.id}`
    )
  }

  const sidebarPanels = {
    documents: (
      <DocumentsSidebar
        documents={documents}
        selectedId={currentFile ?? undefined}
        searchValue={searchValue}
        tagDefinitions={tagDefinitions}
        onSearchChange={setSearchValue}
        onDocumentSelect={handleDocumentSelect}
        onNewDocument={() => undefined}
      />
    ),
    search: (
      <SearchSidebar
        recentSearches={recentSearches}
        savedSearches={savedSearches}
        onSave={handleSearchSave}
        onRemove={handleSearchRemove}
        onSelect={handleSearchSelect}
      />
    ),
    ...(codebook
      ? {
          codes: (
            <CodesSidebar
              codebook={codebook}
              onEditCode={handleEditCode}
              onFileSelect={handleDocumentSelect}
            />
          ),
        }
      : {}),
  }

  return (
    <NabuProvider key={params.projectId}>
      <div {...fileImport.dragHandlers} className="contents">
        <DefaultPageLayout
          activeNav={activeNav}
          showCodes={!!codebook}
          onNavChange={setActiveNav}
          dismissSidebarRef={dismissSidebarRef}
          sidebarPanels={sidebarPanels}
          sidebarFooterExtra={
            <DebugMenuButton
              debugOptions={debugOptions}
              onToggleOption={toggleDebugOption}
              onRequestCompaction={requestCompaction}
            />
          }
          rightPanel={<NabuChatSidebar />}
        >
          <div className="flex h-full w-full items-start bg-default-background">
            <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
              <Outlet
                context={{
                  files,
                  currentFile,
                  debugOptions,
                  toggleDebugOption,
                  requestCompaction,
                  getFileTags,
                  getFileAnnotations,
                  tagDefinitions,
                }}
              />
            </div>
          </div>
          {debugOptions.showStreamPanel && (
            <DebugStreamPanel onClose={() => toggleDebugOption("showStreamPanel")} />
          )}
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
