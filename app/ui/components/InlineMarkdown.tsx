"use client"

import Markdown from "react-markdown"
import { createEntityLinkComponents } from "~/ui/components/markdown/createEntityLinkComponents"

const allowFileProtocol = (url: string) => url

type InlineMarkdownProps = {
  children: string
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

export const InlineMarkdown = ({ children, files, projectId, navigate }: InlineMarkdownProps) => (
  <Markdown
    components={{
      ...createEntityLinkComponents({ files, projectId, navigate }),
      p: ({ children }) => <span>{children}</span>,
    }}
    urlTransform={allowFileProtocol}
  >
    {children}
  </Markdown>
)
