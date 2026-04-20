const DEFAULT_CONCURRENCY = 5

interface PoolOptions {
  concurrency?: number
  target?: number
  warmup?: number
  onItemComplete?: (completed: number, total: number) => void
}

interface PoolResult<R> {
  results: R[]
  consumed: number
}

export const processPool = <T, R>(
  items: T[],
  fn: (item: T) => Promise<R[]>,
  onResults: (results: R[]) => void,
  opts: PoolOptions
): Promise<PoolResult<R>> => {
  const { concurrency = DEFAULT_CONCURRENCY, target, warmup = 0, onItemComplete } = opts
  const all: R[] = []
  let cursor = 0
  let inFlight = 0
  let completed = 0
  let done = false

  return new Promise<PoolResult<R>>((resolve) => {
    const isComplete = (): boolean => done || (cursor >= items.length && inFlight === 0)
    const hasReachedTarget = (): boolean => target !== undefined && all.length >= target

    const settle = () => {
      if (!done) {
        done = true
        resolve({ results: [...all], consumed: cursor })
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
          () => {
            inFlight--
            completed++
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
