import type { ComponentType } from "react"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { resolveFeatherIcon } from "~/ui/theme/feather-map"
import { elementBackground, solidBackground, lowContrastText } from "~/ui/theme/radix"
import { cn } from "~/ui/utils"

interface TagBadgeProps {
  tag: TagDefinition
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
}

const TagIcon = ({
  icon: Icon,
  color,
}: {
  icon: ComponentType<{ className?: string }>
  color: string
}) => (
  <span className="inline-flex" style={{ color }}>
    <Icon className="h-3 w-3" />
  </span>
)

const isInteractive = (onClick: (() => void) | undefined): onClick is () => void =>
  onClick !== undefined

export const TagBadge = ({
  tag,
  active = true,
  disabled = false,
  onClick,
  className,
}: TagBadgeProps) => {
  const Icon = resolveFeatherIcon(tag.icon)
  const colored = active || !isInteractive(onClick)

  const style = colored
    ? {
        backgroundColor: elementBackground(tag.color),
        color: lowContrastText(tag.color),
      }
    : undefined

  const iconColor = colored ? solidBackground(tag.color) : "currentColor"

  const Tag = isInteractive(onClick) ? "button" : "span"

  return (
    <Tag
      type={isInteractive(onClick) ? "button" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-caption-bold font-caption-bold transition-colors",
        isInteractive(onClick) && !disabled && "cursor-pointer border-none",
        disabled && "cursor-not-allowed border-none",
        !colored && "bg-neutral-100 text-subtext-color hover:bg-neutral-200",
        className
      )}
      style={style}
      onClick={onClick}
    >
      <TagIcon icon={Icon} color={iconColor} />
      {tag.display}
    </Tag>
  )
}
