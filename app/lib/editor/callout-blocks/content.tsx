"use client"

import type { ReactNode } from "react"
import * as SubframeCore from "@subframe/core"
import {
  FeatherBook,
  FeatherCode,
  FeatherLightbulb,
  FeatherQuote,
  FeatherAlertCircle,
} from "@subframe/core"
import type { CalloutBlock, CalloutType } from "~/domain/blocks/callout"
import { MarkdownContent } from "~/ui/components/editor/MarkdownContent"

const CALLOUT_ICONS: Record<CalloutType, ReactNode> = {
  codebook: <FeatherBook />,
  code: <FeatherCode />,
  idea: <FeatherLightbulb />,
  quote: <FeatherQuote />,
  note: <FeatherAlertCircle />,
}

type CalloutContentProps = {
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
          {CALLOUT_ICONS[type]}
        </SubframeCore.IconWrapper>
      </div>
      {!collapsed && (
        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
          <span className="text-heading-2 font-heading-2 text-default-font">
            {title}
          </span>
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
