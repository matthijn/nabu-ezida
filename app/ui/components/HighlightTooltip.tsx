import { IconButton } from "~/ui/components/IconButton"
import { FeatherX } from "@subframe/core"

export type HighlightEntry = {
  id: string
  color: string
  title?: string
  description: string
  onDelete?: () => void
}

export type HighlightTooltipProps = {
  entries: HighlightEntry[]
}

const createHeaderBackground = (colors: string[]): string => {
  if (colors.length === 0) return "transparent"
  if (colors.length === 1) return colors[0]
  if (colors.length === 2) return `linear-gradient(to right, ${colors[0]}, ${colors[1]})`
  return `linear-gradient(to right, ${colors[0]}, ${colors.slice(1, -1).map(c => c).join(", ")}, ${colors[colors.length - 1]})`
}

export const HighlightTooltip = ({ entries }: HighlightTooltipProps) => {
  if (entries.length === 0) return null

  const colors = entries.map(e => e.color)
  const headerBackground = createHeaderBackground(colors)

  return (
    <div className="flex w-72 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
      <div
        className="flex h-1 w-full flex-none items-start"
        style={{ background: headerBackground }}
      />
      <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
        {entries.map((entry) => (
          <div key={entry.id} className="flex w-full items-start gap-2">
            <div
              className="flex h-3 w-3 flex-none items-start rounded-full mt-0.5"
              style={{ backgroundColor: entry.color }}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              {entry.title && (
                <span className="text-body-bold font-body-bold text-default-font">
                  {entry.title}
                </span>
              )}
              <span className="text-caption font-caption text-subtext-color">
                {entry.description}
              </span>
            </div>
            {entry.onDelete && (
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={entry.onDelete}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
