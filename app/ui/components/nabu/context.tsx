"use client"

import { useEffect, type ReactNode } from "react"
import { setEditorContext } from "~/lib/editor/chat-context"
import { getCurrentFile } from "~/lib/files"

interface NabuProviderProps {
  children: ReactNode
}

const buildEditorContext = () => {
  const file = getCurrentFile()
  if (!file) return null
  return { documentId: file, documentTitle: file, above: [], below: [] }
}

export const NabuProvider = ({ children }: NabuProviderProps) => {
  useEffect(() => {
    setEditorContext(buildEditorContext)
    return () => setEditorContext(undefined)
  }, [])

  return <>{children}</>
}
