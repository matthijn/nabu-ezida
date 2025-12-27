import { useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useProject } from "./project"
import { FeatherFilePlus } from "@subframe/core"

export default function ProjectIndex() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { project, isConnected } = useProject()

  const documentIds = project ? Object.keys(project.documents) : []
  const firstDocId = documentIds[0]

  useEffect(() => {
    if (firstDocId && projectId) {
      navigate(`/project/${projectId}/file/${firstDocId}`, { replace: true })
    }
  }, [firstDocId, projectId, navigate])

  if (!isConnected) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-subtext-color">Loading...</div>
      </div>
    )
  }

  if (documentIds.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4">
        <FeatherFilePlus className="h-12 w-12 text-subtext-color" />
        <div className="text-lg text-default-font">No files yet</div>
        <div className="text-subtext-color">Create a new file to get started</div>
      </div>
    )
  }

  return null
}
