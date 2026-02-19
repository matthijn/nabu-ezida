import { tool, registerTool, ok } from "../tool"
import { cancel as def } from "./cancel.def"

export const cancel = registerTool(
  tool({ ...def, handler: async (_files, args) => ok(args) })
)
