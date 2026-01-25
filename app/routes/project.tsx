import { useState, useEffect } from "react"
import { Outlet, useNavigate, useParams, useOutletContext } from "react-router"
import { DefaultPageLayout, type ActiveNav } from "~/ui/layouts/DefaultPageLayout"
import { useFiles } from "~/hooks/useFiles"
import { DocumentsSidebar } from "~/ui/custom/sidebar/documents/DocumentsSidebar"
import { CodesSidebar, type Code } from "~/ui/custom/sidebar/codes"
import { closeChat } from "~/lib/chat"
import { NabuProvider, NabuChatSidebar } from "~/ui/components/nabu"
import { buildSpotlightUrl } from "~/domain/spotlight/url"

type SidebarDocument = {
  id: string
  title: string
  editedAt: string
  tags: { label: string; variant: "brand" | "neutral" }[]
  pinned: boolean
}

const filesToSidebarDocuments = (
  files: Record<string, unknown>,
  getFileTags: (filename: string) => string[]
): SidebarDocument[] =>
  Object.keys(files).map((filename) => ({
    id: filename,
    title: filename,
    editedAt: "just now",
    tags: getFileTags(filename).map((tag, i) => ({ label: tag, variant: i === 0 ? "brand" as const : "neutral" as const })),
    pinned: false,
  }))

export type ProjectContextValue = {
  files: Record<string, unknown>
  currentFile: string | null
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

  useEffect(() => {
    return () => closeChat()
  }, [params.projectId])

  const { files, currentFile, codebook, setCurrentFile, getFileTags, getFileAnnotations } = useFiles()

  const documents = filesToSidebarDocuments(files, getFileTags)

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
      <DefaultPageLayout
        activeNav={activeNav}
        showCodes={!!codebook}
        onNavChange={setActiveNav}
      >
        <div className="flex h-full w-full items-start bg-default-background">
          {renderSidebar()}
          <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
            <Outlet context={{ files, currentFile, getFileTags, getFileAnnotations }} />
          </div>
        </div>
        <NabuChatSidebar />
      </DefaultPageLayout>
    </NabuProvider>
  )
}
