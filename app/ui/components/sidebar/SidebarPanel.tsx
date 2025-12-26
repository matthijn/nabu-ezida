"use client"

import React, { Children, isValidElement, type ReactNode } from "react"
import { TextField } from "~/ui/components/TextField"
import { IconButton } from "~/ui/components/IconButton"
import { FeatherChevronsLeft, FeatherChevronsRight, FeatherSearch } from "@subframe/core"
import * as SubframeUtils from "~/ui/utils"

type SearchProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const Search = ({ value, onChange, placeholder = "Search..." }: SearchProps) => (
  <TextField className="h-auto w-full flex-none" variant="filled" label="" helpText="" icon={<FeatherSearch />}>
    <TextField.Input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  </TextField>
)

type ToolbarProps = {
  children: ReactNode
}

const Toolbar = ({ children }: ToolbarProps) => (
  <div className="flex w-full items-center justify-between">{children}</div>
)

type GroupProps = {
  label: string
  children: ReactNode
}

const hasChildren = (children: ReactNode): boolean => {
  let count = 0
  Children.forEach(children, (child) => {
    if (isValidElement(child)) count++
  })
  return count > 0
}

const Group = ({ label, children }: GroupProps) => {
  if (!hasChildren(children)) return null

  return (
    <div className="flex w-full flex-col items-start gap-1">
      <div className="flex w-full items-center gap-2 px-2 py-1">
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

type EmptyProps = {
  children: ReactNode
}

const Empty = ({ children }: EmptyProps) => (
  <div className="flex w-full grow shrink-0 basis-0 items-center justify-center">
    <span className="text-body font-body text-subtext-color">{children}</span>
  </div>
)

type SidebarPanelRootProps = {
  title: string
  collapsed?: boolean
  onCollapse?: () => void
  onExpand?: () => void
  children: ReactNode
  className?: string
}

const SidebarPanelRoot = ({
  title,
  collapsed = false,
  onCollapse,
  onExpand,
  children,
  className,
}: SidebarPanelRootProps) => {
  if (collapsed) {
    return (
      <div className="flex flex-none self-stretch border-r border-solid border-neutral-border bg-default-background relative z-10">
        {onExpand && (
          <IconButton
            className="absolute top-4 -right-[13px] z-50 cursor-pointer"
            variant="brand-secondary"
            size="small"
            icon={<FeatherChevronsRight />}
            onClick={onExpand}
          />
        )}
      </div>
    )
  }

  return (
    <div
      className={SubframeUtils.twClassNames(
        "flex w-72 flex-none flex-col items-start gap-4 self-stretch border-r border-solid border-neutral-border bg-default-background px-4 py-6 relative z-10",
        className
      )}
    >
      {onCollapse && (
        <IconButton
          className="absolute top-4 -right-[13px] z-50 cursor-pointer"
          variant="brand-secondary"
          size="small"
          icon={<FeatherChevronsLeft />}
          onClick={onCollapse}
        />
      )}
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-2 font-heading-2 text-default-font">
          {title}
        </span>
      </div>
      {children}
    </div>
  )
}

export const SidebarPanel = Object.assign(SidebarPanelRoot, {
  Search,
  Toolbar,
  Group,
  Empty,
})
