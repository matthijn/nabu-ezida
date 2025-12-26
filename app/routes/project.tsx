import { useCallback, useState } from "react"
import { toast } from "sonner"
import type { Route } from "./+types/project"
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout"
import { Editor } from "~/lib/editor"
import { useSyncEngine } from "~/hooks/useSyncEngine"
import { getWsUrl, getApiUrl } from "~/lib/env"
import type { Project } from "~/domain/project"
import { projectSchema, syncProjectToDatabase } from "~/domain/project"
import type { FormattedError } from "~/domain/api"
import { DocumentsSidebar } from "~/ui/custom/sidebar/documents/DocumentsSidebar"
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
import type { Document } from "~/domain/document"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nabu - Your AI research partner" },
    { name: "description", content: "Qualitative research workspace" },
  ]
}

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

export default function ProjectPage({ params }: Route.ComponentProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | undefined>()
  const [searchValue, setSearchValue] = useState("")
  const [sortBy, setSortBy] = useState<"modified" | "name">("modified")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const handleError = useCallback((error: FormattedError) => {
    toast.error(error.title, { description: error.description })
  }, [])

  const { state } = useSyncEngine<Project>({
    wsBaseUrl: getWsUrl("/ws"),
    apiBaseUrl: getApiUrl("/api"),
    resourceId: params.projectId,
    schemaSql: projectSchema,
    onError: handleError,
    syncToDatabase: syncProjectToDatabase,
  })

  const project = state.data
  const documents = selectSidebarDocuments(project)
  const selectedDoc = project?.documents[selectedDocId ?? ""]

  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full items-start bg-default-background">
        <DocumentsSidebar
          documents={documents}
          selectedId={selectedDocId}
          searchValue={searchValue}
          sortBy={sortBy}
          collapsed={sidebarCollapsed}
          onSearchChange={setSearchValue}
          onSortChange={setSortBy}
          onDocumentSelect={setSelectedDocId}
          onNewDocument={() => {}}
          onCollapse={() => setSidebarCollapsed(true)}
          onExpand={() => setSidebarCollapsed(false)}
        />
        <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
          <FileHeader
            title={selectedDoc?.name ?? "Untitled Document"}
            tags={selectedDoc?.tags.map((tag: string, i: number) => ({
              label: tag,
              variant: i === 0 ? "brand" : "neutral" as const,
            })) ?? []}
            pinned={selectedDoc?.pinned ?? false}
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
                [
                  { icon: <FeatherLink /> },
                  { icon: <FeatherImage /> },
                ],
                [
                  { icon: <FeatherList /> },
                  { icon: <FeatherListOrdered /> },
                  { icon: <FeatherListChecks /> },
                ],
                [
                  { icon: <FeatherCode2 /> },
                  { icon: <FeatherQuote /> },
                ],
              ]}
            />
            <div className="flex w-full flex-col items-start gap-8 pt-8">
              <Editor key={selectedDocId ?? "default"} />
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}
