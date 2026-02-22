import { Fragment } from "react"
import { IconButton } from "~/ui/components/IconButton"
import { FeatherX, FeatherAlertTriangle } from "@subframe/core"

export type HighlightEntry = {
  id: string
  color: string
  title?: string
  description?: string
  review?: string
  onDelete?: () => void
}

export type HighlightTooltipProps = {
  entries: HighlightEntry[]
}

const ReviewBox = ({ text }: { text: string }) => (
  <div className="flex w-full items-start gap-2 rounded-md bg-warning-50 px-2 py-2">
    <FeatherAlertTriangle className="text-caption font-caption text-warning-600 mt-0.5 flex-none" />
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
      <span className="text-caption-bold font-caption-bold text-warning-900">Needs review</span>
      <span className="text-caption font-caption text-warning-700">{text}</span>
    </div>
  </div>
)

const Divider = () => (
  <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border" />
)

const needsReview = (entry: HighlightEntry): boolean =>
  !!entry.review

const createHeaderBackground = (colors: string[]): string => {
  if (colors.length === 0) return "transparent"
  if (colors.length === 1) return colors[0]
  if (colors.length === 2) return `linear-gradient(to right, ${colors[0]}, ${colors[1]})`
  return `linear-gradient(to right, ${colors[0]}, ${colors.slice(1, -1).join(", ")}, ${colors[colors.length - 1]})`
}

const EntryContent = ({ entry }: { entry: HighlightEntry }) => (
  <div className="flex w-full items-start gap-2">
    <div
      className="flex h-3 w-3 flex-none items-start rounded-full mt-0.5"
      style={{ backgroundColor: entry.color }}
    />
    <div className={`flex grow shrink-0 basis-0 flex-col items-start ${needsReview(entry) ? "gap-2" : "gap-1"}`}>
      {entry.title && (
        <div className="flex w-full items-center gap-2">
          <span className="text-body-bold font-body-bold text-default-font">
            {entry.title}
          </span>
        </div>
      )}
      {entry.description && (
        <span className="text-caption font-caption text-subtext-color">
          {entry.description}
        </span>
      )}
      {needsReview(entry) && <ReviewBox text={entry.review!} />}
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
)

export const HighlightTooltip = ({ entries }: HighlightTooltipProps) => {
  if (entries.length === 0) return null

  const colors = entries.map(e => e.color)
  const headerBackground = createHeaderBackground(colors)

  return (
    <div className="flex w-80 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
      <div
        className="flex h-1 w-full flex-none items-start"
        style={{ background: headerBackground }}
      />
      <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
        {entries.map((entry, i) => (
          <Fragment key={entry.id}>
            {i > 0 && <Divider />}
            <EntryContent entry={entry} />
          </Fragment>
        ))}
      </div>
    </div>
  )
}
