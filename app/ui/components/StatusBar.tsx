import type { ReactNode } from "react"

export const STATUS_TEXT = "text-caption font-caption text-subtext-color"

interface StatusBarProps {
  children: ReactNode
}

const CONTAINER = "flex w-full items-center justify-center gap-2 px-4 py-1.5"

export const StatusBar = ({ children }: StatusBarProps) => (
  <div className={CONTAINER}>{children}</div>
)
