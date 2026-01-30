import { useState, useCallback, useRef, type MouseEvent } from "react"

type Position = { x: number; y: number }

type DragState = {
  startX: number
  startY: number
  startPosX: number
  startPosY: number
}

export const useDraggable = (initialPosition: Position) => {
  const [position, setPosition] = useState(initialPosition)
  const dragRef = useRef<DragState | null>(null)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!dragRef.current) return
      const deltaX = e.clientX - dragRef.current.startX
      const deltaY = e.clientY - dragRef.current.startY
      setPosition({
        x: dragRef.current.startPosX - deltaX,
        y: dragRef.current.startPosY - deltaY,
      })
    }

    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [position])

  return { position, handleMouseDown }
}
