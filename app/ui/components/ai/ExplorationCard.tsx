"use client"

import { FeatherArrowRight, FeatherLightbulb, FeatherLoader2 } from "@subframe/core"
import type { DerivedExploration, Finding } from "~/lib/agent"

const FindingRow = ({ finding }: { finding: Finding }) => (
  <>
    <div className="flex w-full items-start gap-2">
      <FeatherArrowRight className="text-caption text-neutral-400 mt-0.5 shrink-0" />
      <span className="text-caption font-caption text-default-font">{finding.direction}</span>
    </div>
    <div className="flex w-full items-start gap-2">
      <FeatherLightbulb className="text-caption text-brand-600 mt-0.5 shrink-0" />
      <span className="text-caption font-caption text-default-font">{finding.learned}</span>
    </div>
  </>
)

const ActiveDirection = ({ direction }: { direction: string }) => (
  <div className="flex w-full items-start gap-2 rounded-md bg-brand-50 px-2 py-2">
    <FeatherLoader2 className="text-caption text-brand-600 animate-spin mt-0.5 shrink-0" />
    <span className="text-caption font-caption text-brand-700">{direction}</span>
  </div>
)

type ExplorationCardProps = {
  exploration: DerivedExploration
}

export const ExplorationCard = ({ exploration }: ExplorationCardProps) => (
  <div className="flex w-full flex-col items-start gap-2">
    <div className="flex w-full flex-col items-start gap-1 rounded-md bg-neutral-50 px-3 py-2">
      <span className="text-caption-bold font-caption-bold text-subtext-color">Question</span>
      <span className="text-caption font-caption text-default-font">{exploration.question}</span>
    </div>
    {exploration.findings.length > 0 && (
      <div className="flex w-full flex-col items-start gap-1">
        {exploration.findings.map((finding) => (
          <FindingRow key={finding.id} finding={finding} />
        ))}
      </div>
    )}
    {exploration.currentDirection && (
      <ActiveDirection direction={exploration.currentDirection} />
    )}
  </div>
)
