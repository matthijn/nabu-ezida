"use client"

import type { DerivedOrientation, Finding } from "~/lib/agent"
import { StepsBlock, type StepItem } from "./StepsBlock"

const findingToSteps = (finding: Finding): StepItem[] => [
  { type: "direction", content: finding.direction },
  { type: "discovery", content: finding.learned },
]

const toStepItems = (orientation: DerivedOrientation): StepItem[] => {
  const findingSteps = orientation.findings.flatMap(findingToSteps)

  if (orientation.currentDirection) {
    return [...findingSteps, { type: "active", content: orientation.currentDirection }]
  }

  return findingSteps
}

type OrientationCardProps = {
  orientation: DerivedOrientation
  aborted?: boolean
  projectId: string | null
  navigate?: (url: string) => void
}

export const OrientationCard = ({ orientation, aborted, projectId, navigate }: OrientationCardProps) => {
  const steps = toStepItems(orientation)

  return (
    <StepsBlock
      steps={steps}
      aborted={aborted}
      projectId={projectId}
      navigate={navigate}
    />
  )
}
