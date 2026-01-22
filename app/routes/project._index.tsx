import { useEffect } from "react"
import { useNavigate, useParams } from "react-router"
import { useProject } from "./project"
import { FeatherFilePlus } from "@subframe/core"

export default function ProjectIndex() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { files } = useProject()

  const fileNames = Object.keys(files)
  const firstFile = fileNames[0]

  useEffect(() => {
    if (firstFile && projectId) {
      navigate(`/project/${projectId}/file/${encodeURIComponent(firstFile)}`, { replace: true })
    }
  }, [firstFile, projectId, navigate])

  if (fileNames.length === 0) {
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
