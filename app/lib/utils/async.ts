interface Scheduler {
  yield?: () => Promise<void>
}

const scheduler = (globalThis as unknown as { scheduler?: Scheduler }).scheduler

export const yieldToBrowser = (): Promise<void> =>
  scheduler?.yield?.() ?? new Promise((resolve) => setTimeout(resolve, 0))
