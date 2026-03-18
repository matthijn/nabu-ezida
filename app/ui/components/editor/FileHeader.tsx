"use client"

import type { ReactNode, ComponentType } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { DropdownMenu } from "~/ui/components/DropdownMenu"
import { IconButton } from "~/ui/components/IconButton"
import {
  FeatherBug,
  FeatherCheck,
  FeatherClipboard,
  FeatherMinimize,
  FeatherMoreHorizontal,
  FeatherPin,
  FeatherPlus,
  FeatherShare2,
} from "@subframe/core"
import * as SubframeCore from "@subframe/core"
import { cn } from "~/ui/utils"
import {
  elementBackground,
  solidBackground,
  lowContrastText,
  type RadixColor,
} from "~/ui/theme/radix"
import { DEBUG_TOGGLES, type DebugOptions } from "./debug-config"

interface Tag {
  label: string
  variant: "brand" | "neutral"
  color?: RadixColor
  icon?: ComponentType<{ className?: string }>
}

interface MenuItem {
  icon: ReactNode
  label: string
  onClick: () => void
}

interface FileHeaderProps {
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

const renderTag = (tag: Tag) => {
  if (!tag.color) {
    return (
      <Badge variant={tag.variant} icon={null}>
        {tag.label}
      </Badge>
    )
  }
  const Icon = tag.icon
  return (
    <span
      style={
        {
          "--tag-bg": elementBackground(tag.color),
          "--tag-icon": solidBackground(tag.color),
          "--tag-fg": lowContrastText(tag.color),
        } as React.CSSProperties
      }
    >
      <Badge
        variant={tag.variant}
        icon={
          Icon ? (
            <span style={{ color: "var(--tag-icon)" }}>
              <Icon className="h-3 w-3" />
            </span>
          ) : null
        }
        className="!border-[var(--tag-bg)] !bg-[var(--tag-bg)] [&_span]:!text-[var(--tag-fg)]"
      >
        {tag.label}
      </Badge>
    </span>
  )
}

const isActive = (options: DebugOptions | undefined, key: string): boolean =>
  options?.[key] ?? false

const renderToggleItem = (
  key: string,
  label: string,
  icon: ReactNode,
  active: boolean,
  onToggle: (key: string) => void
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
          <span className="text-heading-2 font-heading-2 text-default-font">{title}</span>
        </div>
        {onPin && (
          <IconButton
            variant={pinned ? "brand-tertiary" : "neutral-tertiary"}
            size="small"
            icon={<FeatherPin />}
            onClick={onPin}
          />
        )}
        {onShare && <IconButton size="small" icon={<FeatherShare2 />} onClick={onShare} />}
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
              <SubframeCore.DropdownMenu.Content side="bottom" align="end" sideOffset={4} asChild>
                <DropdownMenu>
                  {DEBUG_TOGGLES.map((t) =>
                    renderToggleItem(
                      t.key,
                      t.label,
                      t.icon,
                      isActive(debugOptions, t.key),
                      onToggleOption
                    )
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
                      <DropdownMenu.DropdownItem icon={<FeatherClipboard />} onClick={onCopyRaw}>
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
              <IconButton size="small" icon={<FeatherMoreHorizontal />} />
            </SubframeCore.DropdownMenu.Trigger>
            <SubframeCore.DropdownMenu.Portal>
              <SubframeCore.DropdownMenu.Content side="bottom" align="end" sideOffset={4} asChild>
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
        <div className="flex w-full flex-wrap items-center gap-2">
          <AnimatePresence initial={false}>
            {tags.map((tag) => (
              <motion.span
                key={tag.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              >
                {renderTag(tag)}
              </motion.span>
            ))}
          </AnimatePresence>
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
