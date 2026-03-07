"use client"

import { createContext, useContext, useCallback, useEffect, type ReactNode } from "react"
import { openChat, closeChat as closeChatStore } from "~/lib/chat/store"
import { clearBlocks } from "~/lib/agent/block-store"
import { clearEntries } from "~/lib/mutation-history"
import { setEditorContext } from "~/lib/chat/context"
import { getCurrentFile } from "~/lib/files"
import { CURRENT_USER, NABU } from "~/domain/participant"
import { getSettings, setSetting } from "~/lib/storage"

type NabuContextValue = {
  startChat: () => void
  closeChat: () => void
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
  useEffect(() => {
    setEditorContext(buildEditorContext)
    return () => setEditorContext(undefined)
  }, [])

  useEffect(() => {
    if (getSettings().chatOpen) {
      openChat(CURRENT_USER, NABU)
    }
  }, [])

  const startChat = useCallback(() => {
    clearBlocks()
    clearEntries()
    openChat(CURRENT_USER, NABU)
    setSetting("chatOpen", true)
  }, [])

  const closeChat = useCallback(() => {
    closeChatStore()
    setSetting("chatOpen", false)
  }, [])

  return (
    <NabuContext.Provider value={{ startChat, closeChat }}>
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
