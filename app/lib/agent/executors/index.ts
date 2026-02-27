import type { ToolDeps } from "../types"
import { getToolHandlers, getToolDefinitions } from "./tool"
import { createExecutor } from "./execute"
import { withModeAwareness } from "./delegation"

import "./tools/apply-local-patch"
import "./tools/cancel"
import "./tools/complete-step"
import "./tools/copy-file"
import "./tools/rename-file"
import "./tools/remove-file"
import "./tools/patch-json-block"
import "./tools/run-local-shell"
import "./tools/ask"
import "./tools/compact"
import "./tools/read-section"
import "./tools/segment-file"

export type { ToolDeps }
export { getToolDefinitions }

export const createToolExecutor = (_deps: ToolDeps) =>
  withModeAwareness(createExecutor(getToolHandlers()))
