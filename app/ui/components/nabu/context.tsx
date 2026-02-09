"use client"

import { createContext, useContext, useCallback, useState, useEffect, type ReactNode } from "react"
import { openChat, closeChat as closeChatStore } from "~/lib/chat/store"
import { clearBlocks } from "~/lib/agent/block-store"
import { setEditorContext } from "~/lib/chat/context"
import { getCurrentFile } from "~/lib/files"
import { CURRENT_USER, NABU } from "~/domain/participant"
import { getSettings, setSetting } from "~/lib/storage"

type NabuContextValue = {
  startChat: () => void
  closeChat: () => void
  minimized: boolean
  minimizeChat: () => void
  restoreChat: () => void
  chatWidth: number
  chatHeight: number
  setChatSize: (width: number, height: number) => void
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
  const [chatWidth, setChatWidth] = useState(() => getSettings().chatWidth)
  const [chatHeight, setChatHeight] = useState(() => getSettings().chatHeight)

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
    openChat(CURRENT_USER, NABU)
    setMinimized(false)
    setSetting("chatOpen", true)
  }, [])

  const closeChat = useCallback(() => {
    closeChatStore()
    setMinimized(false)
    setSetting("chatOpen", false)
  }, [])

  const minimizeChat = useCallback(() => {
    setMinimized(true)
    setSetting("chatOpen", false)
  }, [])

  const restoreChat = useCallback(() => {
    setMinimized(false)
    setSetting("chatOpen", true)
  }, [])

  const setChatSize = useCallback((width: number, height: number) => {
    setChatWidth(width)
    setChatHeight(height)
    setSetting("chatWidth", width)
    setSetting("chatHeight", height)
  }, [])

  return (
    <NabuContext.Provider value={{ startChat, closeChat, minimized, minimizeChat, restoreChat, chatWidth, chatHeight, setChatSize }}>
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
