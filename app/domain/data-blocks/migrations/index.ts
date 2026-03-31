import type { Migration } from "~/lib/data-blocks/migrate"
import { extractAnnotations } from "./extract-annotations"

export const migrations: readonly Migration[] = [extractAnnotations]
