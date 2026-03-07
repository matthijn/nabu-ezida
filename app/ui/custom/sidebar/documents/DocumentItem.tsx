"use client"

import {
  subtleBackground,
  elementBackground,
  solidBackground,
  type RadixColor,
} from "~/lib/colors/radix"

export type DocumentItemProps = {
  title: string
  editedAt: string
  color?: RadixColor
  selected?: boolean
  onClick?: () => void
}

export function DocumentItem({ title, editedAt, color = "lime", selected = false, onClick }: DocumentItemProps) {
  return (
    <div
      style={{ '--tag-subtle': subtleBackground(color), '--tag-element': elementBackground(color) } as React.CSSProperties}
      className={`flex w-full flex-col items-start gap-1 px-3 py-2 cursor-pointer relative ${
        selected
          ? "bg-[var(--tag-element)] group-hover:bg-transparent hover:!bg-[var(--tag-element)]"
          : "hover:bg-[var(--tag-subtle)]"
      }`}
      onClick={onClick}
    >
      {selected && (
        <div
          className="flex w-1 flex-col items-center gap-2 absolute left-0 top-0 bottom-0"
          style={{ backgroundColor: solidBackground(color) }}
        />
      )}
      <span className={`line-clamp-1 ${selected ? "text-body-bold font-body-bold" : "text-body font-body"} text-default-font`}>
        {title}
      </span>
      <span className="text-caption font-caption text-subtext-color">
        {editedAt}
      </span>
    </div>
  )
}
