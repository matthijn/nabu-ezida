"use client"

import Markdown, { type Components } from "react-markdown"
import type { Code } from "./types"

const markdownComponents: Components = {
  h1: ({ children }) => (
    <span className="text-body-bold font-body-bold text-default-font block mt-2">{children}</span>
  ),
  h2: ({ children }) => (
    <span className="text-body-bold font-body-bold text-default-font block mt-2">{children}</span>
  ),
  h3: ({ children }) => (
    <span className="text-body-bold font-body-bold text-default-font block mt-2">{children}</span>
  ),
  p: ({ children }) => (
    <span className="text-body font-body text-default-font block">{children}</span>
  ),
  ul: ({ children }) => <ul className="flex flex-col gap-1 pl-2">{children}</ul>,
  li: ({ children }) => <li className="text-body font-body text-subtext-color">{children}</li>,
}

interface CodeDetailProps {
  code: Code
}

export const CodeDetail = ({ code }: CodeDetailProps) => (
  <div className="flex w-full grow flex-col items-start gap-3 px-4 pb-4 pt-3 overflow-y-auto">
    <Markdown components={markdownComponents}>{code.detail}</Markdown>
  </div>
)
