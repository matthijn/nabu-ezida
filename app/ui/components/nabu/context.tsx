"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

type NabuSidebarContextValue = {
  activeThread: string | null
  openThread: (threadId: string) => void
  closeThread: () => void
}

const NabuSidebarContext = createContext<NabuSidebarContextValue | null>(null)

type NabuSidebarProviderProps = {
  children: ReactNode
}

export const NabuSidebarProvider = ({ children }: NabuSidebarProviderProps) => {
  const [activeThread, setActiveThread] = useState<string | null>(null)

  const openThread = useCallback((threadId: string) => {
    setActiveThread(threadId)
  }, [])

  const closeThread = useCallback(() => {
    setActiveThread(null)
  }, [])

  return (
    <NabuSidebarContext.Provider value={{ activeThread, openThread, closeThread }}>
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
