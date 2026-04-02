import { FeatherLoader2 } from "@subframe/core"
import { TooltipWrap } from "./TooltipWrap"

const STATUS_TEXT = "text-caption font-caption text-subtext-color"
const STATUS_CONTAINER = "flex w-full items-center justify-center gap-2 px-4 py-1.5"

interface StatusBarProps {
  text: string | null
  tooltip?: string
  loading?: boolean
}

export const StatusBar = ({ text, tooltip, loading = false }: StatusBarProps) => {
  if (!text) return null

  const spinner = loading ? <FeatherLoader2 className="text-subtext-color animate-spin" /> : null

  if (!tooltip) {
    return (
      <div className={STATUS_CONTAINER}>
        {spinner}
        <span className={STATUS_TEXT}>{text}</span>
      </div>
    )
  }

  return (
    <div className={STATUS_CONTAINER}>
      {spinner}
      <TooltipWrap text={tooltip}>
        <span className={`${STATUS_TEXT} cursor-default`}>{text}</span>
      </TooltipWrap>
    </div>
  )
}
