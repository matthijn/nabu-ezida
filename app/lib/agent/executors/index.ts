import type { ToolDeps } from "../types"
import type { BlockOrigin } from "../types"
import { getToolHandlers, getToolDefinitions } from "./tool"
import { createExecutor } from "./execute"
import { withDelegation } from "./delegation"

import "./patch"
import "./orientation"
import "./shell"
import "./json-patch"
import "./remove-block"
import "./reporting"

export type { ToolDeps }
export { getToolDefinitions }

export const createToolExecutor = (_deps: ToolDeps, origin?: BlockOrigin) =>
  withDelegation(createExecutor(getToolHandlers()), origin)
