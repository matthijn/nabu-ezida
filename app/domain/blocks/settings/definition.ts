import { Settings } from "./schema"
import type { BlockTypeConfig } from "~/lib/blocks/definition"
import type { ValidationContext } from "~/lib/blocks/validate"
import { validateTagLabels } from "./tags/validation"

export const jsonSettings: BlockTypeConfig<Settings, ValidationContext> = {
  schema: Settings,
  readonly: [],
  immutable: {},
  constraints: ["tags: each tag label must be unique"],
  renderer: "hidden",
  singleton: true,
  allowedFiles: ["settings.hidden.md"],
  idPaths: [{ path: "tags.*.id", prefix: "tag" }],
  validate: validateTagLabels,
}
