"use client"

import { createContext, useContext, type ReactNode } from "react"
import { DEFAULT_DEBUG_OPTIONS, type DebugOptions } from "./debug-config"

const DebugOptionsContext = createContext<DebugOptions>(DEFAULT_DEBUG_OPTIONS)

export const DebugOptionsProvider = ({
  value,
  children,
}: {
  value: DebugOptions
  children: ReactNode
}) => <DebugOptionsContext.Provider value={value}>{children}</DebugOptionsContext.Provider>

export const useDebugOptions = (): DebugOptions => useContext(DebugOptionsContext)
