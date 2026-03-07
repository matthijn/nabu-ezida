import { useState, useCallback, useRef, type MouseEvent } from "react"

type Size = { width: number; height: number }

type DragState = {
  startX: number
  startY: number
  startWidth: number
  startHeight: number
}

type Bounds = {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
}

type ResizableOptions = {
  bounds?: Partial<Bounds>
  storageKey?: string
}

const DEFAULT_BOUNDS: Bounds = {
  minWidth: 280,
  maxWidth: 800,
  minHeight: 400,
  maxHeight: 900,
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

const readStoredSize = (key: string): Size | null => {
  if (typeof localStorage === "undefined") return null
  const stored = localStorage.getItem(key)
  if (!stored) return null
  return JSON.parse(stored) as Size
}

const writeStoredSize = (key: string, size: Size): void => {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(key, JSON.stringify(size))
}

export const useResizable = (initialSize: Size, options: ResizableOptions = {}) => {
  const bounds = { ...DEFAULT_BOUNDS, ...options.bounds }
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds

  const [size, setSize] = useState(() => readStoredSize(options.storageKey ?? "") ?? initialSize)
  const dragRef = useRef<DragState | null>(null)
  const sizeRef = useRef(size)
  sizeRef.current = size

  const handleResizeMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: sizeRef.current.width,
      startHeight: sizeRef.current.height,
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const { minWidth, maxWidth, minHeight, maxHeight } = boundsRef.current
      const deltaX = dragRef.current.startX - e.clientX
      const deltaY = dragRef.current.startY - e.clientY
      setSize({
        width: clamp(dragRef.current.startWidth + deltaX, minWidth, maxWidth),
        height: clamp(dragRef.current.startHeight + deltaY, minHeight, maxHeight),
      })
    }

    const handleMouseUp = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const { minWidth, maxWidth, minHeight, maxHeight } = boundsRef.current
      const finalSize = {
        width: clamp(dragRef.current.startWidth + (dragRef.current.startX - e.clientX), minWidth, maxWidth),
        height: clamp(dragRef.current.startHeight + (dragRef.current.startY - e.clientY), minHeight, maxHeight),
      }
      dragRef.current = null
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      if (options.storageKey) writeStoredSize(options.storageKey, finalSize)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [options.storageKey])

  return { size, setSize, handleResizeMouseDown }
}
