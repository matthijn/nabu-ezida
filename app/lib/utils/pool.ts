export interface PoolOptions {
  concurrency: number
  target?: number
}

export interface PoolResult<R> {
  results: R[]
  consumed: number
}

export const processPool = <T, R>(
  items: T[],
  fn: (item: T) => Promise<R[]>,
  onResults: (results: R[]) => void,
  opts: PoolOptions
): Promise<PoolResult<R>> => {
  const { concurrency, target } = opts
  const all: R[] = []
  let cursor = 0
  let inFlight = 0
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

    const next = () => {
      while (inFlight < concurrency && cursor < items.length && !done) {
        const item = items[cursor++]
        inFlight++

        fn(item).then(
          (results) => {
            inFlight--
            if (done) return

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
            if (done) return

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
