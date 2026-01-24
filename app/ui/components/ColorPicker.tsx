"use client"

import { forwardRef } from "react"
import * as SubframeCore from "@subframe/core"
import { FeatherPalette, FeatherCheck } from "@subframe/core"
import { cn } from "~/ui/utils"
import { BLOCK_COLORS, type RadixColor, elementBackground, subtleBorder } from "~/lib/colors/radix"
import { DropdownMenu } from "./DropdownMenu"
import { IconButton } from "./IconButton"

type ColorSwatchProps = {
  color: RadixColor
  selected: boolean
  onClick: () => void
}

const ColorSwatch = ({ color, selected, onClick }: ColorSwatchProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-6 w-6 flex-none items-center justify-center rounded-md cursor-pointer transition-all",
      selected && "ring-2 ring-offset-1"
    )}
    style={{
      backgroundColor: elementBackground(color),
      borderColor: subtleBorder(color),
      ["--tw-ring-color" as string]: subtleBorder(color),
    }}
  >
    {selected && (
      <FeatherCheck
        className="h-3 w-3"
        style={{ color: `var(--${color}-11)` }}
      />
    )}
  </button>
)

type ColorPickerProps = {
  value: RadixColor
  onColorChange: (color: RadixColor) => void
  label?: string
  className?: string
}

export const ColorPicker = forwardRef<HTMLDivElement, ColorPickerProps>(
  function ColorPicker({ value, onColorChange, label = "Color", className }, ref) {
    return (
      <SubframeCore.DropdownMenu.Root>
        <SubframeCore.DropdownMenu.Trigger asChild>
          <IconButton
            variant="neutral-tertiary"
            size="small"
            icon={<FeatherPalette style={{ color: `var(--${value}-11)` }} />}
          />
        </SubframeCore.DropdownMenu.Trigger>
        <SubframeCore.DropdownMenu.Portal>
          <SubframeCore.DropdownMenu.Content
            side="bottom"
            align="end"
            sideOffset={4}
            asChild
          >
            <DropdownMenu className={cn("min-w-[280px]", className)} ref={ref}>
              <div className="flex w-full flex-col items-start gap-2 px-3 py-2">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  {label}
                </span>
                <div className="flex w-full flex-wrap items-center gap-2">
                  {BLOCK_COLORS.map((color) => (
                    <SubframeCore.DropdownMenu.Item key={color} asChild>
                      <ColorSwatch
                        color={color}
                        selected={value === color}
                        onClick={() => onColorChange(color)}
                      />
                    </SubframeCore.DropdownMenu.Item>
                  ))}
                </div>
              </div>
            </DropdownMenu>
          </SubframeCore.DropdownMenu.Content>
        </SubframeCore.DropdownMenu.Portal>
      </SubframeCore.DropdownMenu.Root>
    )
  }
)
