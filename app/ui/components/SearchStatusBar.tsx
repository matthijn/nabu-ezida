import { FeatherLoader2 } from "@subframe/core"
import { StatusBar, STATUS_TEXT } from "./StatusBar"

interface SearchStatusBarProps {
  count: number
  fileCount: number
  isFiltering: boolean
}

const statusText = (count: number, fileCount: number): string =>
  `Showing ${count} results across ${fileCount} files`

export const SearchStatusBar = ({ count, fileCount, isFiltering }: SearchStatusBarProps) => (
  <StatusBar>
    {isFiltering && <FeatherLoader2 className="text-subtext-color animate-spin" />}
    <span className={STATUS_TEXT}>{statusText(count, fileCount)}</span>
  </StatusBar>
)
