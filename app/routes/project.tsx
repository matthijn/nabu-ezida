import { useCallback, useState, useEffect } from "react"
import { Outlet, useNavigate, useParams, useOutletContext } from "react-router"
import { toast } from "sonner"
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout"
import { useSyncEngine } from "~/hooks/useSyncEngine"
import { getWsUrl, getApiUrl } from "~/lib/env"
import type { Project } from "~/domain/project"
import { projectSchema, syncProjectToDatabase } from "~/domain/project"
import type { FormattedError } from "~/domain/api"
import { DocumentsSidebar } from "~/ui/custom/sidebar/documents/DocumentsSidebar"
import type { Document } from "~/domain/document"
import { clearAllThreads } from "~/lib/threads"
import { NabuSidebarProvider, NabuChatSidebar } from "~/ui/components/nabu"

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
  tags: doc.tags.map((tag, i) => ({ label: tag, variant: i === 0 ? "brand" : "neutral" })),
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
  const [searchValue, setSearchValue] = useState("")
  const [sortBy, setSortBy] = useState<"modified" | "name">("modified")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    return () => clearAllThreads()
  }, [params.projectId])

  const handleError = useCallback((error: FormattedError) => {
    toast.error(error.title, { description: error.description })
  }, [])

  const { state, database } = useSyncEngine<Project>({
    wsBaseUrl: getWsUrl("/ws"),
    apiBaseUrl: getApiUrl("/api"),
    resourceId: params.projectId!,
    schemaSql: projectSchema,
    onError: handleError,
    syncToDatabase: syncProjectToDatabase,
  })

  const project = state.data
  const documents = selectSidebarDocuments(project)

  const handleDocumentSelect = (docId: string) => {
    navigate(`/project/${params.projectId}/file/${docId}`)
  }

  return (
    <NabuSidebarProvider query={database.query} project={project}>
      <DefaultPageLayout>
        <div className="flex h-full w-full items-start bg-default-background">
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
          <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
            <Outlet context={{ project, isConnected: state.isConnected }} />
          </div>
        </div>
        <NabuChatSidebar />
      </DefaultPageLayout>
    </NabuSidebarProvider>
  )
}
