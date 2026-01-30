"use client"

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react"
import { openChat, closeChat as closeChatStore } from "~/lib/chat/store"
import { setEditorContext } from "~/lib/chat/context"
import { getCurrentFile } from "~/lib/files"
import { CURRENT_USER, NABU } from "~/domain/participant"

type NabuContextValue = {
  startChat: () => void
  closeChat: () => void
  minimized: boolean
  minimizeChat: () => void
  restoreChat: () => void
}

const NabuContext = createContext<NabuContextValue | null>(null)

type NabuProviderProps = {
  children: ReactNode
}

const buildEditorContext = () => {
  const file = getCurrentFile()
  if (!file) return null
  return { documentId: file, documentTitle: file, above: [], below: [] }
}

export const NabuProvider = ({ children }: NabuProviderProps) => {
  const [minimized, setMinimized] = useState(false)

  useEffect(() => {
    setEditorContext(buildEditorContext)
    return () => setEditorContext(undefined)
  }, [])

  const startChat = useCallback(() => {
    openChat(CURRENT_USER, NABU)
    setMinimized(false)
  }, [])

  const closeChat = useCallback(() => {
    closeChatStore()
    setMinimized(false)
  }, [])

  const minimizeChat = useCallback(() => {
    setMinimized(true)
  }, [])

  const restoreChat = useCallback(() => {
    setMinimized(false)
  }, [])

  return (
    <NabuContext.Provider value={{ startChat, closeChat, minimized, minimizeChat, restoreChat }}>
      {children}
    </NabuContext.Provider>
  )
}

export const useNabu = (): NabuContextValue => {
  const context = useContext(NabuContext)
  if (!context) {
    throw new Error("useNabu must be used within NabuProvider")
  }
  return context
}
