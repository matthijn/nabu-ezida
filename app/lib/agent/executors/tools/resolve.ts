import { tool, registerTool, ok } from "../tool"
import { resolve as def } from "./resolve.def"

export const resolve = registerTool(
  tool({ ...def, handler: async (_files, args) => ok(args) })
)
