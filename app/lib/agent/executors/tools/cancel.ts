import { tool, registerTool, ok } from "../tool"
import { cancel as def } from "./cancel.def"

const _cancel = registerTool(tool({ ...def, handler: async (_files, args) => ok(args) }))
