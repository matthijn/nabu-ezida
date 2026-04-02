"use client"

import { useState, type ReactNode, type MouseEvent } from "react"
import { TooltipWrap } from "./TooltipWrap"
import { cn } from "~/ui/utils"

interface SwapButtonProps {
  idle: ReactNode
  active: ReactNode
  activeTooltip?: string
  onClick: (e: MouseEvent) => void
  className?: string
}

export const SwapButton = ({
  idle,
  active,
  activeTooltip,
  onClick,
  className,
}: SwapButtonProps) => {
  const [hovered, setHovered] = useState(false)

  const button = (
    <button
      type="button"
      className={cn(
        "flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent h-6 min-w-6 px-0.5",
        className
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation()
        onClick(e)
      }}
    >
      {hovered ? active : idle}
    </button>
  )

  if (activeTooltip) {
    return (
      <TooltipWrap text={activeTooltip} open={hovered}>
        {button}
      </TooltipWrap>
    )
  }

  return button
}
