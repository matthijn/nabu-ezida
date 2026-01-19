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
    connect(wsBaseUrl, projectId).catch((e) => {
      console.error("[useProjectSync] Connect failed:", e)
    })
    return () => disconnect()
  }, [wsBaseUrl, projectId])

  useEffect(() => subscribe(setState), [])

  return state
}
