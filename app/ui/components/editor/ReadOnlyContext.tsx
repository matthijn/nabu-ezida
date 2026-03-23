"use client"

import { createContext, useContext, type ReactNode } from "react"

const ReadOnlyContext = createContext(false)

export const ReadOnlyProvider = ({ value, children }: { value: boolean; children: ReactNode }) => (
  <ReadOnlyContext.Provider value={value}>{children}</ReadOnlyContext.Provider>
)

export const useIsReadOnly = (): boolean => useContext(ReadOnlyContext)
