import type { MultiNudger } from "./nudge-tools"
import { nudge } from "./nudges"

export { type Nudger, type MultiNudger, combine, collect } from "./nudge-tools"

export const toNudge: MultiNudger = (history, files) => nudge(history, files)
