import { FeatherLoader2 } from "@subframe/core"
import { StatusBar, STATUS_TEXT } from "./StatusBar"

interface SearchStatusBarProps {
  count: number
  fileCount: number
  isSearching: boolean
  isFiltering: boolean
}

const resultText = (count: number, fileCount: number): string =>
  `Showing ${count} results across ${fileCount} files`

const isLoading = (isSearching: boolean, isFiltering: boolean): boolean =>
  isSearching || isFiltering

const isNarrowingDown = (isFiltering: boolean, count: number): boolean => isFiltering && count === 0

const displayText = (
  isSearching: boolean,
  isFiltering: boolean,
  count: number,
  fileCount: number
): string => {
  if (isSearching) return "Pre-selecting in corpus"
  if (isNarrowingDown(isFiltering, count)) return "Narrowing down results"
  return resultText(count, fileCount)
}

export const SearchStatusBar = ({
  count,
  fileCount,
  isSearching,
  isFiltering,
}: SearchStatusBarProps) => (
  <StatusBar>
    {isLoading(isSearching, isFiltering) && (
      <FeatherLoader2 className="text-subtext-color animate-spin" />
    )}
    <span className={STATUS_TEXT}>{displayText(isSearching, isFiltering, count, fileCount)}</span>
  </StatusBar>
)
