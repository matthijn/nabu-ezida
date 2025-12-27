"use client"

import { useRef, useLayoutEffect, useCallback, type ReactNode } from "react"

const SCROLL_THRESHOLD = 50

const isNearBottom = (el: HTMLElement): boolean =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD

type AutoScrollProps = {
  children: ReactNode
  className?: string
}

export const AutoScroll = ({ children, className = "" }: AutoScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasNearBottom = useRef(true)

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      wasNearBottom.current = isNearBottom(scrollRef.current)
    }
  }, [])

  useLayoutEffect(() => {
    if (wasNearBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [children])

  return (
    <div ref={scrollRef} onScroll={handleScroll} className={className}>
      {children}
    </div>
  )
}
