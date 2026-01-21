import { useState, useEffect } from "react"
import { Outlet, useNavigate, useParams, useOutletContext } from "react-router"
import { DefaultPageLayout, type ActiveNav } from "~/ui/layouts/DefaultPageLayout"
import { useProjectSync } from "~/hooks/useProjectSync"
import { getWsUrl } from "~/lib/env"
import type { Project } from "~/domain/project"
import { selectDocumentsWithTag } from "~/domain/project/selectors"
import { DocumentsSidebar } from "~/ui/custom/sidebar/documents/DocumentsSidebar"
import { CodesSidebar, type Codebook, type Code } from "~/ui/custom/sidebar/codes"
import type { Document } from "~/domain/document"
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

const toSidebarDocument = (doc: Document): SidebarDocument => ({
  id: doc.id,
  title: doc.name,
  editedAt: doc.updated_at,
  tags: Object.keys(doc.tags).map((tag, i) => ({ label: tag, variant: i === 0 ? "brand" : "neutral" })),
  pinned: doc.pinned,
})

const selectSidebarDocuments = (project: Project | null): SidebarDocument[] =>
  project ? Object.values(project.documents).map(toSidebarDocument) : []

export type ProjectContextValue = {
  project: Project | null
  isConnected: boolean
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

  const { project, parsed, isConnected } = useProjectSync(getWsUrl("/ws"), params.projectId!)

  const documents = selectSidebarDocuments(project)
  const codebook = parsed.codebook as Codebook | undefined

  const handleDocumentSelect = (docId: string) => {
    navigate(`/project/${params.projectId}/file/${docId}`)
  }

  const handleEditCode = (code: Code) => {
    if (!project || !params.projectId) return
    const codebookDoc = selectDocumentsWithTag(project, "codebook")[0]
    if (!codebookDoc) return
    navigate(buildSpotlightUrl(params.projectId, codebookDoc.id, [code.id]))
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
        selectedId={params.fileId}
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
            <Outlet context={{ project, isConnected }} />
          </div>
        </div>
        <NabuChatSidebar />
      </DefaultPageLayout>
    </NabuProvider>
  )
}
