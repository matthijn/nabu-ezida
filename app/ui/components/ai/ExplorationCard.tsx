"use client"

import type { DerivedExploration, Finding } from "~/lib/agent"
import { StepsBlock, type StepItem } from "./StepsBlock"

const findingToSteps = (finding: Finding): StepItem[] => [
  { type: "direction", content: finding.direction },
  { type: "discovery", content: finding.learned },
]

const toStepItems = (exploration: DerivedExploration): StepItem[] => {
  const findingSteps = exploration.findings.flatMap(findingToSteps)

  if (exploration.currentDirection) {
    return [...findingSteps, { type: "active", content: exploration.currentDirection }]
  }

  return findingSteps
}

type ExplorationCardProps = {
  exploration: DerivedExploration
  ask?: string | null
  aborted?: boolean
  projectId: string | null
  navigate?: (url: string) => void
}

export const ExplorationCard = ({ exploration, ask, aborted, projectId, navigate }: ExplorationCardProps) => {
  const steps = toStepItems(exploration)

  return (
    <StepsBlock
      steps={steps}
      ask={ask}
      aborted={aborted}
      projectId={projectId}
      navigate={navigate}
    />
  )
}
