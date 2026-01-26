"use client"

import React from "react"
import { useParams } from "react-router"
import { DropZone } from "./DropZone"
import { FileImportList } from "./FileImportList"
import { useFileImport } from "~/hooks/useFileImport"

export const FileImportView = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const {
    files,
    hasFiles,
    isDragging,
    isProcessing,
    progress,
    dismiss,
    dragHandlers,
  } = useFileImport(projectId)

  return (
    <div
      className="flex h-full w-full flex-col items-start gap-8 bg-default-background px-12 py-12 overflow-y-auto"
      {...dragHandlers}
    >
      <DropZone
        variant={hasFiles ? "compact" : "full"}
        isDragging={isDragging}
        dragHandlers={dragHandlers}
      />

      {hasFiles && (
        <FileImportList
          files={files}
          progress={progress}
          isProcessing={isProcessing}
          onCancel={dismiss}
        />
      )}
    </div>
  )
}
