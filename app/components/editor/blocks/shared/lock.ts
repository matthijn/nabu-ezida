import type { LockState } from "./types"

export const parseLock = (json: string): LockState =>
  json ? JSON.parse(json) : { type: "none" }

export const isLocked = (lock: LockState): boolean =>
  lock.type !== "none"

export const isCodedLock = (lock: LockState): boolean =>
  lock.type === "coded"

export const isUserLock = (lock: LockState): lock is LockState & { type: "user" } =>
  lock.type === "user"

export const isAiLock = (lock: LockState): lock is LockState & { type: "ai" } =>
  lock.type === "ai"
