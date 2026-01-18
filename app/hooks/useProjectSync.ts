import { useEffect, useState } from "react"
import { connect, disconnect, subscribe, getState } from "~/lib/services/projectSync"
import type { Project } from "~/domain/project"

type ProjectSyncState = {
  project: Project | null
  isConnected: boolean
  error: string | null
}

export const useProjectSync = (wsBaseUrl: string, projectId: string): ProjectSyncState => {
  const [state, setState] = useState<ProjectSyncState>(getState)

  useEffect(() => {
    console.debug("[HERMES:DEBUG] useProjectSync effect running", { wsBaseUrl, projectId })
    connect(wsBaseUrl, projectId).catch((e) => {
      console.error("[useProjectSync] Connect failed:", e)
    })
    return () => {
      console.debug("[HERMES:DEBUG] useProjectSync effect cleanup")
      disconnect()
    }
  }, [wsBaseUrl, projectId])

  useEffect(() => subscribe((s) => {
    console.debug("[HERMES:DEBUG] useProjectSync state update", { projectId: s.project?.id ?? "null", isConnected: s.isConnected })
    setState(s)
  }), [])

  return state
}
