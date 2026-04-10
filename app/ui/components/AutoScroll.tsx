"use client"

import { useState, useRef, useLayoutEffect, useCallback, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"

const SCROLL_THRESHOLD = 100

const isNearBottom = (el: HTMLElement): boolean =>
  el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_THRESHOLD

interface AutoScrollProps {
  children: ReactNode
  className?: string
}

const ScrollToBottomButton = ({ onClick }: { onClick: () => void }) => (
  <div className="sticky bottom-3 ml-auto mr-1 pointer-events-none">
    <button
      type="button"
      onClick={onClick}
      className="pointer-events-auto flex h-7 w-7 cursor-pointer items-center justify-center rounded-md bg-neutral-400/80 shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-400"
    >
      <ChevronDown className="h-4 w-4 text-white" />
    </button>
  </div>
)

export const AutoScroll = ({ children, className = "" }: AutoScrollProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const wasNearBottom = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    const nearBottom = isNearBottom(scrollRef.current)
    wasNearBottom.current = nearBottom
    setShowScrollButton(!nearBottom)
  }, [])

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [])

  useLayoutEffect(() => {
    if (wasNearBottom.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [children])

  return (
    <div ref={scrollRef} onScroll={handleScroll} className={className}>
      {children}
      {showScrollButton && <ScrollToBottomButton onClick={scrollToBottom} />}
    </div>
  )
}
