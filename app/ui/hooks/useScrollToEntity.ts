"use client"

import { useEffect, type RefObject } from "react"
import { useSearchParams } from "react-router"

const findEntityElement = (container: HTMLElement, entityId: string): HTMLElement | null =>
  container.querySelector(`[data-id="${entityId}"]`)

const scrollToElement = (element: HTMLElement): void => {
  element.scrollIntoView({ behavior: "smooth", block: "start" })
}

export const useScrollToEntity = (containerRef: RefObject<HTMLElement | null>): void => {
  const [searchParams] = useSearchParams()
  const entityId = searchParams.get("entity")

  useEffect(() => {
    if (!entityId) return

    const container = containerRef.current
    if (!container) return

    const element = findEntityElement(container, entityId)
    if (element) {
      scrollToElement(element)
      return
    }

    let settleTimer: ReturnType<typeof setTimeout> | null = null

    const observer = new MutationObserver(() => {
      const el = findEntityElement(container, entityId)
      if (!el) return
      if (settleTimer) clearTimeout(settleTimer)
      settleTimer = setTimeout(() => {
        observer.disconnect()
        scrollToElement(el)
      }, 150)
    })

    observer.observe(container, { childList: true, subtree: true })
    return () => {
      if (settleTimer) clearTimeout(settleTimer)
      observer.disconnect()
    }
  }, [entityId, containerRef])
}
