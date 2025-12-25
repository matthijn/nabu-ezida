import { useCallback } from "react"
import { toast } from "sonner"
import type { Route } from "./+types/project"
import { AppLayout } from "~/ui/layouts/AppLayout"
import { Editor } from "~/lib/editor"
import { useSyncEngine } from "~/hooks/useSyncEngine"
import { getWsUrl, getApiUrl } from "~/lib/env"
import type { Project } from "~/domain/project"
import { projectSchema, syncProjectToDatabase } from "~/domain/project"
import type { FormattedError } from "~/domain/api"

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Nabu - Your AI research partner" },
    { name: "description", content: "Qualitative research workspace" },
  ]
}

export default function ProjectPage({ params }: Route.ComponentProps) {
  const handleError = useCallback((error: FormattedError) => {
    toast.error(error.title, { description: error.description })
  }, [])

  const { state, database, domain } = useSyncEngine<Project>({
    wsBaseUrl: getWsUrl("/ws"),
    apiBaseUrl: getApiUrl("/api"),
    resourceId: params.projectId,
    schemaSql: projectSchema,
    onError: handleError,
    syncToDatabase: syncProjectToDatabase,
  })

  return (
    <AppLayout>
      <div className="overflow-auto h-full">
        <Editor />
      </div>
    </AppLayout>
  )
}
