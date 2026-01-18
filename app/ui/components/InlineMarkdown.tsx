"use client"

import Markdown, { type Components } from "react-markdown"
import { resolveFileLink } from "~/domain/spotlight"

type MarkdownContext = {
  projectId: string | null
  navigate?: (url: string) => void
}

const allowFileProtocol = (url: string) => url

const createMarkdownComponents = ({ projectId, navigate }: MarkdownContext): Components => ({
  a: (props) => {
    const href = props.href as string | undefined
    const resolved = projectId && href ? resolveFileLink(href, projectId) : null
    const finalHref = resolved ?? href
    const isInternal = resolved !== null

    const handleClick = isInternal && navigate
      ? (e: React.MouseEvent) => {
          e.preventDefault()
          navigate(finalHref!)
        }
      : undefined

    return (
      <a
        {...props}
        href={finalHref}
        onClick={handleClick}
        className="text-brand-600 hover:underline"
        target={isInternal ? undefined : "_blank"}
        rel={isInternal ? undefined : "noopener noreferrer"}
      />
    )
  },
  p: ({ children }) => <span>{children}</span>,
})

type InlineMarkdownProps = {
  children: string
  projectId: string | null
  navigate?: (url: string) => void
}

export const InlineMarkdown = ({ children, projectId, navigate }: InlineMarkdownProps) => (
  <Markdown components={createMarkdownComponents({ projectId, navigate })} urlTransform={allowFileProtocol}>
    {children}
  </Markdown>
)
