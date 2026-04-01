import * as SubframeCore from "@subframe/core"
import { Tooltip } from "./Tooltip"

const STATUS_TEXT = "text-caption font-caption text-subtext-color"
const STATUS_CONTAINER = "flex w-full items-center justify-center gap-2 px-4 py-1.5"

export const StatusBar = ({ text, tooltip }: { text: string | null; tooltip?: string }) => {
  if (!text) return null

  if (!tooltip) {
    return (
      <div className={STATUS_CONTAINER}>
        <span className={STATUS_TEXT}>{text}</span>
      </div>
    )
  }

  return (
    <div className={STATUS_CONTAINER}>
      <SubframeCore.Tooltip.Provider>
        <SubframeCore.Tooltip.Root>
          <SubframeCore.Tooltip.Trigger asChild>
            <span className={`${STATUS_TEXT} cursor-default`}>{text}</span>
          </SubframeCore.Tooltip.Trigger>
          <SubframeCore.Tooltip.Portal>
            <SubframeCore.Tooltip.Content side="top" align="center" sideOffset={4}>
              <Tooltip>{tooltip}</Tooltip>
            </SubframeCore.Tooltip.Content>
          </SubframeCore.Tooltip.Portal>
        </SubframeCore.Tooltip.Root>
      </SubframeCore.Tooltip.Provider>
    </div>
  )
}
