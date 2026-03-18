"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { clearBlocks } from "~/lib/agent/block-store"
import { clearEntries } from "~/lib/mutation-history"
import { setEditorContext } from "~/lib/editor/chat-context"
import { getCurrentFile } from "~/lib/files"
import { getSettings, setSetting } from "~/lib/storage"

interface NabuContextValue {
  chatOpen: boolean
  startChat: () => void
  closeChat: () => void
}

const NabuContext = createContext<NabuContextValue | null>(null)

interface NabuProviderProps {
  children: ReactNode
}

const buildEditorContext = () => {
  const file = getCurrentFile()
  if (!file) return null
  return { documentId: file, documentTitle: file, above: [], below: [] }
}

export const NabuProvider = ({ children }: NabuProviderProps) => {
  const [chatOpen, setChatOpen] = useState(() => getSettings().chatOpen ?? false)

  useEffect(() => {
    setEditorContext(buildEditorContext)
    return () => setEditorContext(undefined)
  }, [])

  const startChat = useCallback(() => {
    clearBlocks()
    clearEntries()
    setChatOpen(true)
    setSetting("chatOpen", true)
  }, [])

  const closeChat = useCallback(() => {
    setChatOpen(false)
    setSetting("chatOpen", false)
  }, [])

  return (
    <NabuContext.Provider value={{ chatOpen, startChat, closeChat }}>
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
