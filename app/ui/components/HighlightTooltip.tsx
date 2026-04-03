import {
  FeatherX,
  FeatherTrash2,
  FeatherCircle,
  FeatherCheckCircle,
  FeatherAlertTriangle,
} from "@subframe/core"
import { SwapButton } from "~/ui/components/SwapButton"

export interface HighlightEntry {
  id: string
  color: string
  title?: string
  description?: string
  review?: string
  onDelete?: () => void
  onResolve?: () => void
}

interface HighlightTooltipProps {
  entries: HighlightEntry[]
}

const ReviewBox = ({ text, onResolve }: { text: string; onResolve?: () => void }) => (
  <div className="relative flex w-full items-start gap-2 rounded-md bg-warning-50 px-2 py-2">
    <FeatherAlertTriangle className="text-body text-warning-600 mt-0.5 flex-none" />
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
      <span className="text-body-bold font-body-bold text-warning-900">Needs review</span>
      <span className="text-caption font-caption text-warning-700">{text}</span>
    </div>
    {onResolve && (
      <div className="absolute top-1 right-1">
        <SwapButton
          idle={<FeatherCircle className="text-body text-warning-700" />}
          active={<FeatherCheckCircle className="text-body text-success-600" />}
          activeTooltip="Mark as resolved"
          onClick={onResolve}
        />
      </div>
    )}
  </div>
)

const Divider = () => <div className="h-px w-full bg-neutral-border" />

const needsReview = (entry: HighlightEntry): boolean => !!entry.review

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
    <div
      className={`flex grow shrink-0 basis-0 flex-col items-start ${needsReview(entry) ? "gap-2" : "gap-1"}`}
    >
      {entry.title && (
        <span className="text-body-bold font-body-bold text-default-font">{entry.title}</span>
      )}
      {entry.description && (
        <span className="text-caption font-caption text-subtext-color">{entry.description}</span>
      )}
      {entry.review && <ReviewBox text={entry.review} onResolve={entry.onResolve} />}
    </div>
    {entry.onDelete && (
      <SwapButton
        idle={<FeatherX className="text-body text-neutral-700" />}
        active={<FeatherTrash2 className="text-body text-error-600" />}
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
    <div className="flex w-96 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
      <div
        className="flex h-1 w-full flex-none"
        style={{ background: createHeaderBackground(colors) }}
      />
      <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
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
