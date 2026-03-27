import { FeatherLoader2 } from "@subframe/core"

export interface SearchStatusBarProps {
  count: number
  fileCount: number
  isFiltering: boolean
  isDone: boolean
}

const statusText = (count: number, fileCount: number): string =>
  `Showing ${count} results across ${fileCount} files`

const BASE = "flex w-full items-center justify-center gap-2 px-4 py-1.5"
const TEXT = "text-caption font-caption text-subtext-color"

export const SearchStatusBar = ({ count, fileCount, isFiltering }: SearchStatusBarProps) => (
  <div className={BASE}>
    {isFiltering && <FeatherLoader2 className="text-subtext-color animate-spin" />}
    <span className={TEXT}>{statusText(count, fileCount)}</span>
  </div>
)
