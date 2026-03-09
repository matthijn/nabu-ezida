"use client"

import {
  elementBackground,
  solidBackground,
  type RadixColor,
} from "~/lib/colors/radix"
import { annotationIcon as AnnotationIcon } from "~/domain/attributes/schema"

export type DocumentItemProps = {
  title: string
  editedAt: string
  annotationCount?: number
  color?: RadixColor
  selected?: boolean
  onClick?: () => void
}

export function DocumentItem({ title, editedAt, annotationCount = 0, color = "lime", selected = false, onClick }: DocumentItemProps) {
  return (
    <div
      style={{ '--tag-element': elementBackground(color) } as React.CSSProperties}
      className={`flex w-full flex-col items-start gap-1 px-3 py-2 cursor-pointer relative ${
        selected
          ? "bg-[var(--tag-element)] group-hover:bg-transparent hover:!bg-[var(--tag-element)]"
          : "hover:bg-[var(--tag-element)]"
      }`}
      onClick={onClick}
    >
      {selected && (
        <div
          className="flex w-1 flex-col items-center gap-2 absolute left-0 top-0 bottom-0"
          style={{ backgroundColor: solidBackground(color) }}
        />
      )}
      <span className="line-clamp-1 text-body font-body text-default-font">
        {title}
      </span>
      <div className="flex w-full items-center gap-1">
        <span className="text-caption font-caption text-subtext-color">
          {editedAt}
        </span>
        {annotationCount > 0 && (
          <span className="flex items-center gap-0.5 text-caption font-caption text-subtext-color ml-auto">
            <AnnotationIcon className="w-3 h-3" />
            {annotationCount}
          </span>
        )}
      </div>
    </div>
  )
}
