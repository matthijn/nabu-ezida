"use client"

import { useEffect, type RefObject } from "react"
import { useSearchParams } from "react-router"

type ScrollBlock = "center" | "start"

const scrollToElement = (element: HTMLElement, block: ScrollBlock): void => {
  element.scrollIntoView({ behavior: "smooth", block })
}

interface ScrollTarget {
  selector: string
  key: string
  block: ScrollBlock
}

const deriveScrollTarget = (searchParams: URLSearchParams): ScrollTarget | null => {
  const entityId = searchParams.get("entity")
  if (entityId)
    return { selector: `[data-id="${entityId}"]`, key: `entity:${entityId}`, block: "center" }
  const spotlight = searchParams.get("spotlight")
  if (spotlight)
    return { selector: "[data-spotlight]", key: `spotlight:${spotlight}`, block: "center" }
  return null
}

const findElement = (container: HTMLElement, selector: string): HTMLElement | null =>
  container.querySelector(selector)

const observeAndScroll = (
  container: HTMLElement,
  selector: string,
  block: ScrollBlock
): (() => void) => {
  let settleTimer: ReturnType<typeof setTimeout> | null = null

  const observer = new MutationObserver(() => {
    const el = findElement(container, selector)
    if (!el) return
    if (settleTimer) clearTimeout(settleTimer)
    settleTimer = setTimeout(() => {
      observer.disconnect()
      scrollToElement(el, block)
    }, 150)
  })

  observer.observe(container, { childList: true, subtree: true })
  return () => {
    if (settleTimer) clearTimeout(settleTimer)
    observer.disconnect()
  }
}

export const useScrollToEntity = (containerRef: RefObject<HTMLElement | null>): void => {
  const [searchParams] = useSearchParams()
  const target = deriveScrollTarget(searchParams)
  const selector = target?.selector
  const block = target?.block
  const key = target?.key

  useEffect(() => {
    if (!selector || !block) return

    const container = containerRef.current
    if (!container) return

    const element = findElement(container, selector)
    if (element) {
      scrollToElement(element, block)
      return
    }

    return observeAndScroll(container, selector, block)
  }, [key, selector, block, containerRef])
}
