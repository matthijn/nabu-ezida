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

const DEFAULT_BOUNDS: Bounds = {
  minWidth: 280,
  maxWidth: 800,
  minHeight: 400,
  maxHeight: 900,
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

export const useResizable = (initialSize: Size, bounds: Partial<Bounds> = {}) => {
  const { minWidth, maxWidth, minHeight, maxHeight } = { ...DEFAULT_BOUNDS, ...bounds }
  const [size, setSize] = useState(initialSize)
  const dragRef = useRef<DragState | null>(null)

  const handleResizeMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const deltaX = dragRef.current.startX - e.clientX
      const deltaY = dragRef.current.startY - e.clientY
      setSize({
        width: clamp(dragRef.current.startWidth + deltaX, minWidth, maxWidth),
        height: clamp(dragRef.current.startHeight + deltaY, minHeight, maxHeight),
      })
    }

    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [size, minWidth, maxWidth, minHeight, maxHeight])

  return { size, setSize, handleResizeMouseDown }
}
