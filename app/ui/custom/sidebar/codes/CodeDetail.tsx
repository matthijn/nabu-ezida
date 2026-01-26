"use client"

import Markdown, { type Components } from "react-markdown"
import { FeatherEdit2 } from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import {
  solidBackground,
  elementBackground,
  hoveredElementBorder,
} from "~/lib/colors/radix"
import type { Code } from "./types"

const markdownComponents: Components = {
  h1: ({ children }) => (
    <span className="text-caption-bold font-caption-bold text-default-font block mt-2">
      {children}
    </span>
  ),
  h2: ({ children }) => (
    <span className="text-caption-bold font-caption-bold text-default-font block mt-2">
      {children}
    </span>
  ),
  h3: ({ children }) => (
    <span className="text-caption-bold font-caption-bold text-default-font block mt-2">
      {children}
    </span>
  ),
  p: ({ children }) => (
    <span className="text-caption font-caption text-default-font block">
      {children}
    </span>
  ),
  ul: ({ children }) => (
    <ul className="flex flex-col gap-1 pl-2">{children}</ul>
  ),
  li: ({ children }) => (
    <li className="text-caption font-caption text-subtext-color">
      {children}
    </li>
  ),
}

type CodeDetailProps = {
  code: Code
  onEdit?: () => void
}

export const CodeDetail = ({ code, onEdit }: CodeDetailProps) => (
  <div
    className="flex w-full flex-col items-start gap-3 border-t-2 border-solid px-4 py-4 max-h-64 overflow-y-auto"
    style={{
      borderColor: hoveredElementBorder(code.color),
      backgroundColor: elementBackground(code.color),
    }}
  >
    <div className="flex w-full items-center gap-2">
      <div
        className="flex h-3 w-3 flex-none rounded-full"
        style={{ backgroundColor: solidBackground(code.color) }}
      />
      <span className="text-body-bold font-body-bold text-default-font">
        {code.name}
      </span>
      <IconButton size="small" icon={<FeatherEdit2 />} onClick={onEdit} />
    </div>
    <Markdown components={markdownComponents}>{code.detail}</Markdown>
  </div>
)
