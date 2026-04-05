"use client"

import { createContext, useContext, type ReactNode } from "react"

const FilePathContext = createContext<string | undefined>(undefined)

export const FilePathProvider = ({
  value,
  children,
}: {
  value: string | undefined
  children: ReactNode
}) => <FilePathContext.Provider value={value}>{children}</FilePathContext.Provider>

export const useFilePath = (): string | undefined => useContext(FilePathContext)
