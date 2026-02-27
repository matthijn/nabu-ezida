import { tool, registerTool, ok, err } from "../tool"
import { readSectionTool as def } from "./read-section.def"
import { readFileProse, readFileAnnotations, sliceLines } from "./file-content"
import { filterMatchingAnnotations } from "~/domain/attributes/annotations"

const formatResult = (prose: string, annotations: string): string =>
  annotations ? `${prose}\n\n### Annotations\n${annotations}` : prose

registerTool(
  tool({
    ...def,
    handler: async (_files, { file, start, end, annotations }) => {
      const prose = readFileProse(file)
      if (!prose) return err(`${file}: empty or not found`)

      const slice = sliceLines(prose, start, end)
      if (!slice) return err(`${file}: line range ${start}-${end} is empty`)

      if (!annotations) return ok(slice)

      const allAnnotations = readFileAnnotations(file)
      const matching = filterMatchingAnnotations(allAnnotations, slice)
      const annotationJson = matching.length > 0 ? JSON.stringify(matching) : ""
      return ok(formatResult(slice, annotationJson))
    },
  })
)
