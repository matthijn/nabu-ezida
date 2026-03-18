import { tool, registerTool, ok } from "../../executors/tool"
import { cancel as def } from "./def"

const _cancel = registerTool(tool({ ...def, handler: async (_files, args) => ok(args) }))
