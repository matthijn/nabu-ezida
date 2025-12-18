import type { ReactNode } from "react"
import type { LockState } from "./types"
import { isUserLock, isAiLock } from "./lock"

type LockedWrapperProps = {
  lock: LockState
  children: ReactNode
}

const lockLabel = (lock: LockState): string => {
  switch (lock.type) {
    case "none":
      return ""
    case "coded":
      return "Coded"
    case "user":
      return `Editing: ${lock.userId}`
    case "ai":
      return "AI Processing"
    default:
      throw new Error(`Unknown lock type: ${(lock as LockState).type}`)
  }
}

export const LockedWrapper = ({ lock, children }: LockedWrapperProps) => {
  const showUserIndicator = isUserLock(lock)
  const showAiIndicator = isAiLock(lock)

  return (
    <div className="locked-block relative">
      {(showUserIndicator || showAiIndicator) && (
        <div className="locked-block-indicator absolute -left-6 top-0 text-xs text-muted-foreground">
          {lockLabel(lock)}
        </div>
      )}
      <div className="locked-block-content select-text">
        {children}
      </div>
    </div>
  )
}
