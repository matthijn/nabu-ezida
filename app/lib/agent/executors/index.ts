import type { ToolDeps } from "../types"
import type { BlockOrigin } from "../types"
import { getToolHandlers, getToolDefinitions } from "./tool"
import { createExecutor } from "./execute"
import { withDelegation } from "./delegation"

import "./tools/apply-local-patch"
import "./tools/orientate"
import "./tools/resolve"
import "./tools/cancel"
import "./tools/complete-step"
import "./tools/complete-substep"
import "./tools/copy-file"
import "./tools/rename-file"
import "./tools/remove-file"
import "./tools/patch-json-block"
import "./tools/remove-block"
import "./tools/run-local-shell"
import "./tools/delegate"
import "./tools/execute-with-plan"
import "./tools/for-each"

export type { ToolDeps }
export { getToolDefinitions }

export const createToolExecutor = (_deps: ToolDeps, origin?: BlockOrigin) =>
  withDelegation(createExecutor(getToolHandlers()), origin)
