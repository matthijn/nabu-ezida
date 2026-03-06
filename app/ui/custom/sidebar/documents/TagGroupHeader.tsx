"use client"

import { FeatherHash, FeatherChevronUp, FeatherChevronDown } from "@subframe/core"
import { Badge } from "~/ui/components/Badge"

type TagGroupHeaderProps = {
  tag: string
  count: number
  expanded: boolean
  onClick: () => void
}

const humanize = (tag: string): string =>
  tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

export function TagGroupHeader({ tag, count, expanded, onClick }: TagGroupHeaderProps) {
  const Chevron = expanded ? FeatherChevronUp : FeatherChevronDown

  return (
    <div
      className={`flex w-full items-center justify-between px-3 py-3 cursor-pointer ${
        expanded ? "border-b border-solid border-neutral-border bg-brand-50" : "hover:bg-neutral-50"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <FeatherHash className={`text-body font-body ${expanded ? "text-brand-600" : "text-subtext-color"}`} />
        <span className={`text-body-bold font-body-bold ${expanded ? "text-brand-900" : "text-default-font"}`}>
          {humanize(tag)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={expanded ? "brand" : "neutral"}>{count}</Badge>
        <Chevron className={`text-body font-body ${expanded ? "text-brand-600" : "text-subtext-color"}`} />
      </div>
    </div>
  )
}
