"use client"

import { createContext, useContext, useCallback, useState, type ReactNode } from "react"
import type { QueryResult } from "~/lib/db/types"
import type { Project } from "~/domain/project"
import type { DocumentContext } from "~/lib/chat/store"
import { openChat, closeChat as closeChatStore, updateCurrentContext } from "~/lib/chat/store"
import { CURRENT_USER, NABU } from "~/domain/participant"

type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>
type NavigateFn = (url: string) => void

type NabuContextValue = {
  startChat: () => void
  updateContext: (context: DocumentContext | null) => void
  closeChat: () => void
  minimized: boolean
  minimizeChat: () => void
  restoreChat: () => void
  query?: QueryFn
  project: Project | null
  navigate?: NavigateFn
}

const NabuContext = createContext<NabuContextValue | null>(null)

type NabuProviderProps = {
  children: ReactNode
  query?: QueryFn
  project: Project | null
  navigate?: NavigateFn
}

export const NabuProvider = ({ children, query, project, navigate }: NabuProviderProps) => {
  const [minimized, setMinimized] = useState(false)

  const startChat = useCallback(() => {
    openChat(CURRENT_USER, NABU)
    setMinimized(false)
  }, [])

  const updateContext = useCallback((context: DocumentContext | null) => {
    updateCurrentContext(context)
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
    <NabuContext.Provider value={{ startChat, updateContext, closeChat, minimized, minimizeChat, restoreChat, query, project, navigate }}>
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
