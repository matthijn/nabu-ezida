import { getFileRaw } from "~/lib/files"
import { stripAttributesBlock } from "~/lib/markdown/strip-attributes"

export const readFileContent = (file: string): string =>
  stripAttributesBlock(getFileRaw(file) ?? "")
