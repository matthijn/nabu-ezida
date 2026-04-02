import { useState, useEffect, useRef } from "react"

export const useThrottledValue = <T>(value: T, delay: number): T => {
  const [throttled, setThrottled] = useState(value)
  const lastRun = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const now = Date.now()
    const elapsed = now - lastRun.current

    const flush = () => {
      lastRun.current = Date.now()
      setThrottled(value)
    }

    if (elapsed >= delay) {
      flush()
    } else {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, delay - elapsed)
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current)
        timer.current = null
      }
    }
  }, [value, delay])

  return throttled
}
