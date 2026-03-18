"use client"

import { createElement } from "react"
import * as SubframeCore from "@subframe/core"
import { calloutTypeIcons, type CalloutBlock } from "~/domain/data-blocks/callout/schema"
import { MarkdownContent } from "~/ui/components/editor/MarkdownContent"

interface CalloutContentProps {
  data: CalloutBlock
}

export const CalloutContent = ({ data }: CalloutContentProps) => {
  const { type, title, content, color, collapsed } = data

  return (
    <>
      <div
        className="flex items-center justify-center rounded-md px-1 py-1 self-start"
        style={{ color: `var(--${color}-11)` }}
      >
        <SubframeCore.IconWrapper className="text-heading-3 font-heading-3">
          {createElement(calloutTypeIcons[type])}
        </SubframeCore.IconWrapper>
      </div>
      {!collapsed && (
        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
          <span className="text-heading-2 font-heading-2 text-default-font">{title}</span>
          <MarkdownContent content={content} />
        </div>
      )}
      {collapsed && (
        <span className="grow shrink-0 basis-0 text-heading-2 font-heading-2 text-default-font self-center">
          {title}
        </span>
      )}
    </>
  )
}
