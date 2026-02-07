"use client"

import type { Components } from "react-markdown"
import { createElement } from "react"
import { FeatherMessageCircle, FeatherFileText } from "@subframe/core"
import { resolveEntityLink, type EntityIcons } from "~/lib/entity-link"
import { EntityLink } from "./EntityLink"

export type EntityLinkContext = {
  files: Record<string, string>
  projectId: string | null
  navigate?: (url: string) => void
}

const entityIcons: EntityIcons = {
  annotation: FeatherMessageCircle,
  callout: FeatherFileText,
  text: FeatherFileText,
}

const createAnchorComponent = ({ files, projectId, navigate }: EntityLinkContext): Components["a"] =>
  (props) => {
    const href = props.href as string | undefined
    if (!href) return createElement("a", props)

    const resolved = projectId ? resolveEntityLink(href, files, projectId, entityIcons) : null

    if (resolved) {
      const handleClick = navigate
        ? (e: React.MouseEvent) => {
            e.preventDefault()
            navigate(resolved.url)
          }
        : undefined

      return createElement(EntityLink, {
        href: resolved.url,
        colors: resolved.colors,
        icon: resolved.icon,
        onClick: handleClick,
        children: props.children,
      })
    }

    const isExternal = href.startsWith("http://") || href.startsWith("https://")
    return createElement("a", {
      ...props,
      href,
      target: isExternal ? "_blank" : undefined,
      rel: isExternal ? "noopener noreferrer" : undefined,
      className: "text-brand-600 hover:underline",
    })
  }

export const createEntityLinkComponents = (ctx: EntityLinkContext): Partial<Components> => ({
  a: createAnchorComponent(ctx),
})
