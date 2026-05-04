import { X, Trash2 } from "lucide-react"
import { SwapButton } from "~/ui/components/SwapButton"

export interface HighlightEntry {
  id: string
  color: string
  title?: string
  description?: string
  onDelete?: () => void
}

interface HighlightTooltipProps {
  entries: HighlightEntry[]
}

const Divider = () => <div className="h-px w-full bg-neutral-border" />

const createHeaderBackground = (colors: string[]): string => {
  if (colors.length === 0) return "transparent"
  if (colors.length === 1) return colors[0]
  if (colors.length === 2) return `linear-gradient(to right, ${colors[0]}, ${colors[1]})`
  return `linear-gradient(to right, ${colors[0]}, ${colors.slice(1, -1).join(", ")}, ${colors[colors.length - 1]})`
}

const EntryContent = ({ entry }: { entry: HighlightEntry }) => (
  <div className="flex w-full items-start gap-2">
    <div
      className="flex h-3 w-3 flex-none rounded-full mt-0.5"
      style={{ backgroundColor: entry.color }}
    />
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
      {entry.title && (
        <span className="text-body-bold font-body-bold text-default-font">{entry.title}</span>
      )}
      {entry.description && (
        <span className="text-caption font-caption text-subtext-color">{entry.description}</span>
      )}
    </div>
    {entry.onDelete && (
      <SwapButton
        idle={<X className="text-body text-neutral-700" />}
        active={<Trash2 className="text-body text-error-600" />}
        activeTooltip="Remove annotation"
        onClick={entry.onDelete}
      />
    )}
  </div>
)

export const HighlightTooltip = ({ entries }: HighlightTooltipProps) => {
  if (entries.length === 0) return null

  const colors = entries.map((e) => e.color)

  return (
    <div
      data-tooltip-root
      className="flex w-96 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg"
    >
      <div
        className="flex h-1 w-full flex-none"
        style={{ background: createHeaderBackground(colors) }}
      />
      <div className="flex w-full min-h-0 flex-col items-start gap-3 overflow-y-auto px-3 py-3">
        {entries.map((entry, i) => (
          <div key={entry.id} className="flex w-full flex-col items-start gap-3">
            {i > 0 && <Divider />}
            <EntryContent entry={entry} />
          </div>
        ))}
      </div>
    </div>
  )
}
