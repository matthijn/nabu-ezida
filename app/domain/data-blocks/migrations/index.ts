import type { Migration } from "~/lib/data-blocks/migrate"
import { extractAnnotations } from "./extract-annotations"
import { wrapAnnotations } from "./wrap-annotations"

export const migrations: readonly Migration[] = [extractAnnotations, wrapAnnotations]
