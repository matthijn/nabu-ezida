"use client"

import { solidBackground, elementBackground, hoveredElementBorder } from "~/ui/theme/radix"
import type { Code } from "./types"

interface CodeItemProps {
  code: Code
  count?: number
  highlighted?: boolean
  onMouseEnter?: () => void
  onClick?: () => void
}

export const CodeItem = ({
  code,
  count = 0,
  highlighted = false,
  onMouseEnter,
  onClick,
}: CodeItemProps) => (
  <div
    className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-solid px-3 py-2"
    style={{
      backgroundColor: elementBackground(code.color),
      borderColor: highlighted ? hoveredElementBorder(code.color) : "transparent",
    }}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
  >
    <div
      className="flex h-2 w-2 flex-none rounded-full"
      style={{ backgroundColor: solidBackground(code.color) }}
    />
    <span className="grow shrink-0 basis-0 text-body font-body text-default-font">{code.name}</span>
    {count > 0 && (
      <span
        className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none text-white"
        style={{ backgroundColor: solidBackground(code.color) }}
      >
        {count}
      </span>
    )}
  </div>
)
