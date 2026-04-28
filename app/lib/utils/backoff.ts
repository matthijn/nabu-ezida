interface BackoffConfig {
  baseDelay?: number
  maxDelay: number
}

export const calculateBackoff = (
  attempt: number,
  { baseDelay = 1000, maxDelay }: BackoffConfig
): number => {
  const ceiling = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  return Math.random() * ceiling
}
