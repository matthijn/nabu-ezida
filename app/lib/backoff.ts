type BackoffConfig = {
  baseDelay?: number
  maxDelay: number
  jitter?: number
}

export const calculateBackoff = (
  attempt: number,
  { baseDelay = 1000, maxDelay, jitter = 1000 }: BackoffConfig
): number => {
  const exponential = Math.min(baseDelay * Math.pow(2, attempt), maxDelay)
  return exponential + Math.random() * jitter
}
