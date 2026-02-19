import { tool, registerTool, ok } from "../tool"
import { completeSubstep as def } from "./complete-substep.def"

export const completeSubstep = registerTool(
  tool({ ...def, handler: async () => ok({}) })
)
