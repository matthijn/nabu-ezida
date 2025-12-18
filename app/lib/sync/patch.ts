import { produce } from "immer"
import { applyPatch, type Operation } from "fast-json-patch"

export type PatchableMessage<T> =
  | { type: "snapshot"; data: T }
  | { type: "patch"; data: Operation[] }

export const applyPatchableMessage = <T>(
  current: T | null,
  message: PatchableMessage<T>
): T | null => {
  if (message.type === "snapshot") {
    return message.data
  }

  if (current === null) {
    return null
  }

  return produce(current, draft => {
    applyPatch(draft, message.data, true, true)
  })
}
