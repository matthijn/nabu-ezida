const DEFAULT_CONCURRENCY = 4

export interface PoolFailure<T> {
  item: T
  error: unknown
}

interface PoolOptions {
  concurrency?: number
  target?: number
  warmup?: number
  onItemComplete?: (completed: number, total: number) => void
}

interface PoolResult<T, R> {
  results: R[]
  failures: PoolFailure<T>[]
  consumed: number
}

export const processPool = <T, R>(
  items: T[],
  fn: (item: T) => Promise<R[]>,
  onResults: (results: R[]) => void,
  opts: PoolOptions
): Promise<PoolResult<T, R>> => {
  const { concurrency = DEFAULT_CONCURRENCY, target, warmup = 0, onItemComplete } = opts
  const all: R[] = []
  const failed: PoolFailure<T>[] = []
  let cursor = 0
  let inFlight = 0
  let completed = 0
  let done = false

  return new Promise<PoolResult<T, R>>((resolve) => {
    const isComplete = (): boolean => done || (cursor >= items.length && inFlight === 0)
    const hasReachedTarget = (): boolean => target !== undefined && all.length >= target

    const settle = () => {
      if (!done) {
        done = true
        resolve({ results: [...all], failures: [...failed], consumed: cursor })
      }
    }

    const activeConcurrency = (): number => (warmup > 0 && completed < warmup ? 1 : concurrency)

    const next = () => {
      while (inFlight < activeConcurrency() && cursor < items.length && !done) {
        const item = items[cursor++]
        inFlight++

        fn(item).then(
          (results) => {
            inFlight--
            completed++
            if (done) return

            onItemComplete?.(completed, items.length)

            if (results.length > 0) {
              all.push(...results)
              onResults(results)
            }

            if (hasReachedTarget() || isComplete()) {
              settle()
            } else {
              next()
            }
          },
          (error: unknown) => {
            inFlight--
            completed++
            failed.push({ item, error })
            console.error("[pool] item failed:", error)
            if (done) return

            onItemComplete?.(completed, items.length)

            if (isComplete()) {
              settle()
            } else {
              next()
            }
          }
        )
      }

      if (isComplete()) settle()
    }

    if (items.length === 0) {
      settle()
      return
    }

    next()
  })
}
