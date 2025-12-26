"use client"

import type { ReactNode } from "react"
import { Badge } from "~/ui/components/Badge"
import { Button } from "~/ui/components/Button"
import { DropdownMenu } from "~/ui/components/DropdownMenu"
import { IconButton } from "~/ui/components/IconButton"
import { FeatherMoreHorizontal, FeatherPin, FeatherPlus, FeatherShare2 } from "@subframe/core"
import * as SubframeCore from "@subframe/core"
import * as SubframeUtils from "~/ui/utils"

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
  onPin?: () => void
  onShare?: () => void
  menuItems?: MenuItem[]
  onAddTag?: () => void
  className?: string
}

export const FileHeader = ({
  title,
  tags = [],
  pinned = false,
  onPin,
  onShare,
  menuItems = [],
  onAddTag,
  className,
}: FileHeaderProps) => (
  <div
    className={SubframeUtils.twClassNames(
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
