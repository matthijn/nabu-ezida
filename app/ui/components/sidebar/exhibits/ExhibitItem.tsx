"use client"

import type { ComponentType } from "react"
import { elementBackground, solidBackground, type RadixColor } from "~/ui/theme/radix"

interface ExhibitItemProps {
  title: string
  documentTitle: string
  icon: ComponentType<{ className?: string }>
  color: RadixColor
  selected?: boolean
  onClick?: () => void
}

export function ExhibitItem({
  title,
  documentTitle,
  icon: Icon,
  color,
  selected = false,
  onClick,
}: ExhibitItemProps) {
  return (
    <div
      style={{ "--exhibit-element": elementBackground(color) } as React.CSSProperties}
      className={`flex w-full items-start gap-3 px-3 py-2.5 cursor-pointer relative ${
        selected
          ? "bg-[var(--exhibit-element)] group-hover:bg-transparent hover:!bg-[var(--exhibit-element)]"
          : "hover:bg-[var(--exhibit-element)]"
      }`}
      onClick={onClick}
    >
      {selected && (
        <div
          className="flex w-1 flex-col items-center gap-2 absolute left-0 top-0 bottom-0"
          style={{ backgroundColor: solidBackground(color) }}
        />
      )}
      <div
        className="flex h-8 w-8 flex-none items-center justify-center rounded-md mt-0.5"
        style={{ backgroundColor: elementBackground(color) }}
      >
        <span style={{ color: solidBackground(color) }}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-0.5">
        <span className="line-clamp-1 text-body font-body text-default-font">{title}</span>
        <span className="line-clamp-1 text-caption font-caption text-subtext-color">
          {documentTitle}
        </span>
      </div>
    </div>
  )
}
