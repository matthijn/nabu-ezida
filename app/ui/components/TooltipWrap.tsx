"use client"

import type { ReactNode } from "react"
import * as SubframeCore from "@subframe/core"
import { Tooltip } from "./Tooltip"

interface TooltipWrapProps {
  text: ReactNode
  side?: "top" | "bottom" | "left" | "right"
  open?: boolean
  children: ReactNode
}

export const TooltipWrap = ({ text, side = "top", open, children }: TooltipWrapProps) => (
  <SubframeCore.Tooltip.Provider delayDuration={0}>
    <SubframeCore.Tooltip.Root open={open}>
      <SubframeCore.Tooltip.Trigger asChild>{children}</SubframeCore.Tooltip.Trigger>
      <SubframeCore.Tooltip.Portal>
        <SubframeCore.Tooltip.Content
          side={side}
          align="center"
          sideOffset={4}
          style={{ zIndex: 2147483647 }}
        >
          <Tooltip>{text}</Tooltip>
        </SubframeCore.Tooltip.Content>
      </SubframeCore.Tooltip.Portal>
    </SubframeCore.Tooltip.Root>
  </SubframeCore.Tooltip.Provider>
)
