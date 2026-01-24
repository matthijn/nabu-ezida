"use client"

import { forwardRef, type HTMLAttributes, type ReactNode } from "react"
import * as SubframeCore from "@subframe/core"
import {
  FeatherBook,
  FeatherCode,
  FeatherLightbulb,
  FeatherQuote,
  FeatherAlertCircle,
  FeatherChevronDown,
  FeatherChevronRight,
} from "@subframe/core"
import { cn } from "~/ui/utils"
import { type RadixColor, elementBackground, subtleBorder } from "~/lib/colors/radix"
import { DropdownMenu } from "./DropdownMenu"
import { IconButton } from "./IconButton"
import { ColorPicker } from "./ColorPicker"

export type CalloutType = "codebook" | "code" | "idea" | "quote" | "note"

type CalloutTypeConfig = {
  icon: ReactNode
  label: string
}

const CALLOUT_TYPES: Record<CalloutType, CalloutTypeConfig> = {
  codebook: { icon: <FeatherBook />, label: "Codebook" },
  code: { icon: <FeatherCode />, label: "Code" },
  idea: { icon: <FeatherLightbulb />, label: "Idea" },
  quote: { icon: <FeatherQuote />, label: "Quote" },
  note: { icon: <FeatherAlertCircle />, label: "Note" },
}

const getCalloutIcon = (type: CalloutType): ReactNode => CALLOUT_TYPES[type].icon

type TypeSelectorProps = {
  type: CalloutType
  color: RadixColor
  onChange: (type: CalloutType) => void
}

const TypeSelector = ({ type, color, onChange }: TypeSelectorProps) => (
  <SubframeCore.DropdownMenu.Root>
    <SubframeCore.DropdownMenu.Trigger asChild>
      <button
        type="button"
        className="flex items-center justify-center rounded-md px-1 py-1 cursor-pointer transition-colors"
        style={{
          color: `var(--${color}-11)`,
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = `var(--${color}-4)`
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = "transparent"
        }}
      >
        <SubframeCore.IconWrapper className="text-heading-3 font-heading-3">
          {getCalloutIcon(type)}
        </SubframeCore.IconWrapper>
      </button>
    </SubframeCore.DropdownMenu.Trigger>
    <SubframeCore.DropdownMenu.Portal>
      <SubframeCore.DropdownMenu.Content
        side="bottom"
        align="start"
        sideOffset={4}
        asChild
      >
        <DropdownMenu>
          {(Object.entries(CALLOUT_TYPES) as [CalloutType, CalloutTypeConfig][]).map(
            ([key, config]) => (
              <DropdownMenu.DropdownItem
                key={key}
                icon={config.icon}
                onClick={() => onChange(key)}
              >
                {config.label}
              </DropdownMenu.DropdownItem>
            )
          )}
        </DropdownMenu>
      </SubframeCore.DropdownMenu.Content>
    </SubframeCore.DropdownMenu.Portal>
  </SubframeCore.DropdownMenu.Root>
)

export type CalloutData = {
  id: string
  type: CalloutType
  title: string
  content: string
  color: RadixColor
  collapsed: boolean
}

interface CalloutProps extends Omit<HTMLAttributes<HTMLDivElement>, "onChange" | "title" | "content"> {
  data: CalloutData
  onChange: (data: CalloutData) => void
}

export const Callout = forwardRef<HTMLDivElement, CalloutProps>(
  function Callout({ data, onChange, className, ...props }, ref) {
    const { type, title, content, color, collapsed } = data

    const handleTypeChange = (newType: CalloutType) =>
      onChange({ ...data, type: newType })

    const handleColorChange = (newColor: RadixColor) =>
      onChange({ ...data, color: newColor })

    const handleCollapseToggle = () =>
      onChange({ ...data, collapsed: !collapsed })

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full flex-col items-start gap-4 rounded-lg border border-solid px-4 py-4",
          className
        )}
        style={{
          backgroundColor: elementBackground(color),
          borderColor: subtleBorder(color),
        }}
        {...props}
      >
        <div className="flex w-full items-start gap-3">
          <TypeSelector type={type} color={color} onChange={handleTypeChange} />
          {!collapsed && (
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
              <span className="text-heading-2 font-heading-2 text-default-font">
                {title}
              </span>
              <span className="text-body font-body text-default-font">
                {content}
              </span>
            </div>
          )}
          {collapsed && (
            <span className="grow shrink-0 basis-0 text-heading-2 font-heading-2 text-default-font self-center">
              {title}
            </span>
          )}
          <ColorPicker value={color} onColorChange={handleColorChange} />
          <IconButton
            variant="neutral-tertiary"
            size="small"
            icon={collapsed ? <FeatherChevronRight /> : <FeatherChevronDown />}
            onClick={handleCollapseToggle}
          />
        </div>
      </div>
    )
  }
)
