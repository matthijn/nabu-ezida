import { tool, registerTool, ok } from "../tool"
import { completeStep as def } from "./complete-step.def"

const completeStep = registerTool(
  tool({ ...def, handler: async (_files, args) => ok(args) })
)
