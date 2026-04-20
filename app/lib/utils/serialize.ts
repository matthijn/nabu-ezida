export const serialize = <T>(fn: () => Promise<T>): (() => Promise<T>) => {
  let active: Promise<T> | null = null
  return () => {
    if (active) return active
    active = fn().finally(() => {
      active = null
    })
    return active
  }
}
