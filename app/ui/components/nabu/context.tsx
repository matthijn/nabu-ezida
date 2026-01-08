"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type { QueryResult } from "~/lib/db/types"
import type { Project } from "~/domain/project"

type QueryFn = <T = unknown>(sql: string) => Promise<QueryResult<T>>

type NabuSidebarContextValue = {
  openThreads: string[]
  openThread: (threadId: string) => void
  closeThread: (threadId: string) => void
  isThreadOpen: (threadId: string) => boolean
  query?: QueryFn
  project: Project | null
}

const NabuSidebarContext = createContext<NabuSidebarContextValue | null>(null)

type NabuSidebarProviderProps = {
  children: ReactNode
  query?: QueryFn
  project: Project | null
}

export const NabuSidebarProvider = ({ children, query, project }: NabuSidebarProviderProps) => {
  const [openThreads, setOpenThreads] = useState<string[]>([])

  const openThread = useCallback((threadId: string) => {
    setOpenThreads((prev) => (prev.includes(threadId) ? prev : [...prev, threadId]))
  }, [])

  const closeThread = useCallback((threadId: string) => {
    setOpenThreads((prev) => prev.filter((id) => id !== threadId))
  }, [])

  const isThreadOpen = useCallback(
    (threadId: string) => openThreads.includes(threadId),
    [openThreads]
  )

  return (
    <NabuSidebarContext.Provider value={{ openThreads, openThread, closeThread, isThreadOpen, query, project }}>
      {children}
    </NabuSidebarContext.Provider>
  )
}

export const useNabuSidebar = (): NabuSidebarContextValue => {
  const context = useContext(NabuSidebarContext)
  if (!context) {
    throw new Error("useNabuSidebar must be used within NabuSidebarProvider")
  }
  return context
}
