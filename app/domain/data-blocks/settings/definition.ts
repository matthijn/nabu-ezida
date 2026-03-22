import { Settings } from "./schema"
import type { BlockTypeConfig } from "~/lib/data-blocks/definition"
import type { ValidationContext } from "~/lib/data-blocks/validate"
import { validateTagLabels } from "./tags/validation"
import { validateSearchSql } from "./searches/validation"

export const jsonSettings: BlockTypeConfig<Settings, ValidationContext> = {
  schema: Settings,
  readonly: [],
  immutable: {},
  constraints: ["tags: each tag label must be unique"],
  renderer: "hidden",
  singleton: true,
  allowedFiles: ["settings.hidden.md"],
  idPaths: [
    { path: "tags.*.id", prefix: "tag" },
    { path: "searches.*.id", prefix: "search" },
  ],
  validate: (parsed) => [...validateTagLabels(parsed), ...validateSearchSql(parsed)],
}
