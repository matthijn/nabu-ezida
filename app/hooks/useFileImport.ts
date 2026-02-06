import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import { produce } from "immer"
import { processFiles, isMarkdownFile, readDroppedItems, type ImportFile, type ImportStatus, type FileWithPath } from "~/lib/import"

type ImportState = {
  files: Record<string, ImportFile>
  isProcessing: boolean
}

const initialState: ImportState = {
  files: {},
  isProcessing: false,
}

const createImportFile = (file: File): ImportFile => ({
  id: file.name,
  name: file.name,
  size: file.size,
  status: isMarkdownFile(file.name) ? "pending" : "unsupported",
})

export const useFileImport = () => {
  const [state, setState] = useState<ImportState>(initialState)
  const [isDragging, setIsDragging] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const dragCounterRef = useRef(0)

  const files = useMemo(() => Object.values(state.files), [state.files])

  const hasFiles = files.length > 0

  const progress = useMemo(() => {
    const total = files.length
    const completed = files.filter((f) => f.status === "completed").length
    const failed = files.filter((f) => f.status === "error").length
    const unsupported = files.filter((f) => f.status === "unsupported").length
    return { total, completed, failed, unsupported, processed: completed + failed + unsupported }
  }, [files])

  const updateFileStatus = useCallback(
    (id: string, status: ImportStatus, extra?: Partial<ImportFile>) => {
      setState((prev) =>
        produce(prev, (draft) => {
          const file = draft.files[id]
          if (file) {
            file.status = status
            if (extra?.error) file.error = extra.error
            if (extra?.finalPath) file.finalPath = extra.finalPath
          }
        })
      )
    },
    []
  )

  const addFiles = useCallback(
    async (filesWithPath: FileWithPath[]) => {
      if (filesWithPath.length === 0) return

      setState((prev) =>
        produce(prev, (draft) => {
          for (const { file } of filesWithPath) {
            if (!draft.files[file.name]) {
              draft.files[file.name] = createImportFile(file)
            }
          }
          draft.isProcessing = true
        })
      )

      const markdownFiles = filesWithPath
        .filter(({ file }) => isMarkdownFile(file.name))
        .map(({ file, pathTags }) => ({ file, tags: pathTags }))
      await processFiles(markdownFiles, updateFileStatus)

      setState((prev) =>
        produce(prev, (draft) => {
          draft.isProcessing = false
        })
      )
    },
    [updateFileStatus]
  )

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current++
    if (dragCounterRef.current === 1) {
      setIsDragging(true)
      setIsVisible(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      dragCounterRef.current = 0
      setIsDragging(false)

      const filesWithPath = await readDroppedItems(e.dataTransfer)
      if (filesWithPath.length > 0) {
        addFiles(filesWithPath)
      }
    },
    [addFiles]
  )

  const dismiss = useCallback(() => {
    setIsVisible(false)
    setState(initialState)
  }, [])

  useEffect(() => {
    if (!isVisible && !hasFiles) {
      dragCounterRef.current = 0
    }
  }, [isVisible, hasFiles])

  const dragHandlers = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  }

  return {
    files,
    hasFiles,
    isDragging,
    isVisible,
    isProcessing: state.isProcessing,
    progress,
    addFiles,
    dismiss,
    dragHandlers,
  }
}
