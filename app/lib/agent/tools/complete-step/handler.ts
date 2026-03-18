import { tool, registerTool, ok } from "../../executors/tool"
import { completeStep as def } from "./def"

const _completeStep = registerTool(tool({ ...def, handler: async (_files, args) => ok(args) }))
