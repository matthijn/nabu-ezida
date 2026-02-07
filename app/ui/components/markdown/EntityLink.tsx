"use client"

import type { ComponentType } from "react"
import type { ResolvedColors } from "~/lib/entity-link"

export type EntityLinkProps = {
  href: string
  children: React.ReactNode
  colors: ResolvedColors
  icon: ComponentType<{ className?: string }>
  onClick?: (e: React.MouseEvent) => void
}

export const EntityLink = ({ href, children, colors, icon: Icon, onClick }: EntityLinkProps) => (
  <a
    href={href}
    onClick={onClick}
    className="inline rounded px-1 py-0.5 no-underline font-normal cursor-pointer transition-colors"
    style={{
      color: colors.text,
      backgroundColor: colors.background,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.backgroundHover }}
    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = colors.background }}
  >
    <span className="inline-flex align-[-0.15em] mr-1" style={{ color: colors.icon }}>
      <Icon className="h-3.5 w-3.5" />
    </span>
    {children}
  </a>
)
