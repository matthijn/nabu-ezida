"use client"

import type { ReactNode } from "react"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { DropdownMenu } from "~/ui/components/DropdownMenu"
import { IconButton } from "~/ui/components/IconButton"
import { FeatherBug, FeatherCheck, FeatherClipboard, FeatherMinimize, FeatherMoreHorizontal, FeatherPin, FeatherPlus, FeatherShare2 } from "@subframe/core"
import * as SubframeCore from "@subframe/core"
import { cn } from "~/ui/utils"
import { DEBUG_TOGGLES, type DebugOptions } from "./debug-config"

type Tag = {
  label: string
  variant: "brand" | "neutral"
}

type MenuItem = {
  icon: ReactNode
  label: string
  onClick: () => void
}

type FileHeaderProps = {
  title: string
  tags?: Tag[]
  pinned?: boolean
  debugOptions?: DebugOptions
  onPin?: () => void
  onShare?: () => void
  onToggleOption?: (key: string) => void
  onRequestCompaction?: () => void
  onCopyRaw?: () => void
  menuItems?: MenuItem[]
  onAddTag?: () => void
  className?: string
}

const isActive = (options: DebugOptions | undefined, key: string): boolean =>
  options?.[key] ?? false

const renderToggleItem = (
  key: string,
  label: string,
  icon: ReactNode,
  active: boolean,
  onToggle: (key: string) => void,
) => (
  <DropdownMenu.DropdownItem
    key={key}
    icon={active ? <FeatherCheck /> : icon}
    onClick={() => onToggle(key)}
  >
    {label}
  </DropdownMenu.DropdownItem>
)

export const FileHeader = ({
  title,
  tags = [],
  pinned = false,
  debugOptions,
  onPin,
  onShare,
  onToggleOption,
  onRequestCompaction,
  onCopyRaw,
  menuItems = [],
  onAddTag,
  className,
}: FileHeaderProps) => {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4",
        className
      )}
    >
      <div className="flex w-full items-start gap-2">
        <div className="flex grow shrink-0 basis-0 items-center gap-2">
          <span className="text-heading-2 font-heading-2 text-default-font">
            {title}
          </span>
        </div>
        {onPin && (
          <IconButton
            variant={pinned ? "brand-tertiary" : "neutral-tertiary"}
            size="small"
            icon={<FeatherPin />}
            onClick={onPin}
          />
        )}
        {onShare && (
          <IconButton
            size="small"
            icon={<FeatherShare2 />}
            onClick={onShare}
          />
        )}
        {onToggleOption && (
          <SubframeCore.DropdownMenu.Root>
            <SubframeCore.DropdownMenu.Trigger asChild>
              <IconButton
                variant={isActive(debugOptions, "expanded") ? "brand-primary" : "neutral-tertiary"}
                size="small"
                icon={<FeatherBug />}
              />
            </SubframeCore.DropdownMenu.Trigger>
            <SubframeCore.DropdownMenu.Portal>
              <SubframeCore.DropdownMenu.Content
                side="bottom"
                align="end"
                sideOffset={4}
                asChild
              >
                <DropdownMenu>
                  {DEBUG_TOGGLES.map((t) =>
                    renderToggleItem(t.key, t.label, t.icon, isActive(debugOptions, t.key), onToggleOption)
                  )}
                  {onRequestCompaction && (
                    <DropdownMenu.DropdownItem
                      icon={<FeatherMinimize />}
                      onClick={onRequestCompaction}
                    >
                      Force compaction
                    </DropdownMenu.DropdownItem>
                  )}
                  {onCopyRaw && (
                    <>
                      <DropdownMenu.DropdownDivider />
                      <DropdownMenu.DropdownItem
                        icon={<FeatherClipboard />}
                        onClick={onCopyRaw}
                      >
                        Copy raw
                      </DropdownMenu.DropdownItem>
                    </>
                  )}
                </DropdownMenu>
              </SubframeCore.DropdownMenu.Content>
            </SubframeCore.DropdownMenu.Portal>
          </SubframeCore.DropdownMenu.Root>
        )}
        {menuItems.length > 0 && (
          <SubframeCore.DropdownMenu.Root>
            <SubframeCore.DropdownMenu.Trigger asChild>
              <IconButton
                size="small"
                icon={<FeatherMoreHorizontal />}
              />
            </SubframeCore.DropdownMenu.Trigger>
            <SubframeCore.DropdownMenu.Portal>
              <SubframeCore.DropdownMenu.Content
                side="bottom"
                align="end"
                sideOffset={4}
                asChild
              >
                <DropdownMenu>
                  {menuItems.map((item) => (
                    <DropdownMenu.DropdownItem
                      key={item.label}
                      icon={item.icon}
                      onClick={item.onClick}
                    >
                      {item.label}
                    </DropdownMenu.DropdownItem>
                  ))}
                </DropdownMenu>
              </SubframeCore.DropdownMenu.Content>
            </SubframeCore.DropdownMenu.Portal>
          </SubframeCore.DropdownMenu.Root>
        )}
      </div>
      {(tags.length > 0 || onAddTag) && (
        <div className="flex w-full items-center gap-2">
          {tags.map((tag) => (
            <Badge key={tag.label} variant={tag.variant} icon={null}>
              {tag.label}
            </Badge>
          ))}
          {onAddTag && (
            <Button
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherPlus />}
              onClick={onAddTag}
            >
              Add tag
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
