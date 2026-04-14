import { getFilesStripped } from "~/lib/files/store"
import { isCompanionFile } from "~/lib/embeddings/companion"
import { injectBoundaryComments } from "~/lib/patch/resolve/json-boundary"

export const getViewableFiles = (): Map<string, string> =>
  new Map(
    Object.entries(getFilesStripped())
      .filter(([k]) => !isCompanionFile(k))
      .map(([k, v]) => [k, injectBoundaryComments(v)])
  )

export const getFileView = (path: string): string | undefined => getViewableFiles().get(path)
