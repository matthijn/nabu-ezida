type BarMode = "idle" | "filtering" | "done"

export interface StickyStatusPillProps {
  count: number
  fileCount: number
  isFiltering: boolean
  isDone: boolean
}

const deriveMode = (isFiltering: boolean, isDone: boolean): BarMode => {
  if (isFiltering) return "filtering"
  if (isDone) return "done"
  return "idle"
}

const barText = (mode: BarMode, count: number, fileCount: number): string => {
  switch (mode) {
    case "filtering":
      return "Searching for more..."
    case "done":
      return `Showing ${count} results across ${fileCount} files`
    case "idle":
      return `Showing ${count} results across ${fileCount} files`
  }
}

const barBgClass = (mode: BarMode): string => {
  switch (mode) {
    case "filtering":
      return "bg-brand-100"
    case "done":
      return "bg-transparent"
    case "idle":
      return "bg-transparent"
  }
}

const barTextClass = (mode: BarMode): string => {
  switch (mode) {
    case "filtering":
      return "text-caption font-caption text-brand-700"
    case "done":
      return "text-caption font-caption text-neutral-500"
    case "idle":
      return "text-caption font-caption text-subtext-color"
  }
}

const BASE =
  "flex w-full items-center justify-center px-4 py-1.5 transition-[background-color] duration-300"

export const StickyStatusPill = ({
  count,
  fileCount,
  isFiltering,
  isDone,
}: StickyStatusPillProps) => {
  const mode = deriveMode(isFiltering, isDone)

  return (
    <div className={`${BASE} ${barBgClass(mode)}`}>
      <span className={barTextClass(mode)}>{barText(mode, count, fileCount)}</span>
    </div>
  )
}
