import { useMemo } from "react"
import * as SubframeCore from "@subframe/core"
import { Tooltip } from "./Tooltip"
import { StatusBar, STATUS_TEXT } from "./StatusBar"
import { computeTextStats, formatStatsLabel, formatStatsDetail } from "~/lib/text/stats"
import { stripAttributesBlock } from "~/lib/markdown/strip-attributes"
import {
  getDocumentType,
  getDocumentSource,
  getDocumentSubject,
} from "~/domain/data-blocks/attributes/topics/selectors"

interface DocumentStatusBarProps {
  content: string
}

const formatClassificationLine = (
  type: string | undefined,
  source: string | undefined,
  subject: string | undefined
): string | null => {
  const parts = [type, source, subject].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}

export const DocumentStatusBar = ({ content }: DocumentStatusBarProps) => {
  const stats = useMemo(() => computeTextStats(stripAttributesBlock(content)), [content])
  const type = useMemo(() => getDocumentType(content), [content])
  const source = useMemo(() => getDocumentSource(content), [content])
  const subject = useMemo(() => getDocumentSubject(content), [content])
  const classificationLine = formatClassificationLine(type, source, subject)

  return (
    <StatusBar>
      <SubframeCore.Tooltip.Provider>
        <SubframeCore.Tooltip.Root>
          <SubframeCore.Tooltip.Trigger asChild>
            <span className={`${STATUS_TEXT} cursor-default`}>{formatStatsLabel(stats)}</span>
          </SubframeCore.Tooltip.Trigger>
          <SubframeCore.Tooltip.Portal>
            <SubframeCore.Tooltip.Content side="top" align="center" sideOffset={4}>
              <Tooltip>
                {formatStatsDetail(stats)}
                {classificationLine && (
                  <>
                    <br />
                    {classificationLine}
                  </>
                )}
              </Tooltip>
            </SubframeCore.Tooltip.Content>
          </SubframeCore.Tooltip.Portal>
        </SubframeCore.Tooltip.Root>
      </SubframeCore.Tooltip.Provider>
    </StatusBar>
  )
}
