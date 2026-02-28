import { alreadyFired, systemNudge, type Nudger } from "../nudge-tools"

const MARKER = "[plan-structure]"

const reminder = `${MARKER}
For file-level tasks: (1) clarify what the user wants, (2) use segment_file to discover sections, (3) build plan steps from those sections — each step or group of sections is a deliverable. Don't collapse segments into one monolithic step.`

export const planStructureNudge: Nudger = (history) => {
  if (alreadyFired(history, MARKER)) return null
  return systemNudge(reminder)
}
