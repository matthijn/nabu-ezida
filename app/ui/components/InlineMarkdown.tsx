"use client"

import Markdown from "react-markdown"
import { createEntityLinkComponents } from "~/ui/components/markdown/createEntityLinkComponents"
import { linkifyEntityIds } from "~/domain/entity-link"
import { resolveEntityName } from "~/lib/files/selectors"

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
    {linkifyEntityIds(children, (id) => resolveEntityName(files, id))}
  </Markdown>
)
