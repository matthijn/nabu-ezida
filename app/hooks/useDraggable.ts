import { useState, useCallback, useRef, type MouseEvent } from "react"

type Position = { x: number; y: number }

type Anchor = { x?: "left" | "right"; y?: "top" | "bottom" }

type DragState = {
  startX: number
  startY: number
  startPosX: number
  startPosY: number
}

const anchorSign = (edge: "left" | "right" | "top" | "bottom"): number =>
  edge === "left" || edge === "top" ? 1 : -1

export const useDraggable = (initialPosition: Position, anchor: Anchor = {}) => {
  const [position, setPosition] = useState(initialPosition)
  const dragRef = useRef<DragState | null>(null)
  const xSign = anchorSign(anchor.x ?? "right")
  const ySign = anchorSign(anchor.y ?? "bottom")

  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
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
        x: dragRef.current.startPosX + xSign * deltaX,
        y: dragRef.current.startPosY + ySign * deltaY,
      })
    }

    const handleMouseUp = () => {
      dragRef.current = null
      setIsDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }, [position, xSign, ySign])

  return { position, isDragging, handleMouseDown }
}
