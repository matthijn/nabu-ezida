"use client"

import { FeatherHash, FeatherChevronUp, FeatherChevronDown } from "@subframe/core"
import { Badge } from "~/ui/components/Badge"
import {
  subtleBackground,
  elementBackground,
  subtleBorder,
  lowContrastText,
  highContrastText,
  type RadixColor,
} from "~/lib/colors/radix"

type TagGroupHeaderProps = {
  tag: string
  count: number
  expanded: boolean
  color?: RadixColor
  onClick: () => void
}

const humanize = (tag: string): string =>
  tag
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())

export function TagGroupHeader({ tag, count, expanded, color = "lime", onClick }: TagGroupHeaderProps) {
  const Chevron = expanded ? FeatherChevronUp : FeatherChevronDown
  const accentStyle = expanded ? { color: lowContrastText(color) } : undefined

  return (
    <div
      style={{
        '--tag-subtle': subtleBackground(color),
        '--tag-element': elementBackground(color),
        ...(expanded ? {
          borderColor: subtleBorder(color),
          backgroundColor: subtleBackground(color),
        } : {}),
      } as React.CSSProperties}
      className={`flex w-full items-center justify-between px-3 py-3 cursor-pointer ${
        expanded ? "border-b border-solid" : "hover:bg-[var(--tag-subtle)]"
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <FeatherHash
          className={`text-body font-body ${expanded ? "" : "text-subtext-color"}`}
          style={accentStyle}
        />
        <span
          className={`text-body-bold font-body-bold ${expanded ? "" : "text-default-font"}`}
          style={expanded ? { color: highContrastText(color) } : undefined}
        >
          {humanize(tag)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="neutral"
          className={expanded ? "!border-[var(--tag-element)] !bg-[var(--tag-element)]" : ""}
        >
          {count}
        </Badge>
        <Chevron
          className={`text-body font-body ${expanded ? "" : "text-subtext-color"}`}
          style={accentStyle}
        />
      </div>
    </div>
  )
}
