"use client"

import { FeatherTrash2 } from "@subframe/core"
import type { CalloutBlock } from "~/domain/blocks/callout"
import type { RadixColor } from "~/lib/colors/radix"
import { elementBackground, subtleBorder } from "~/lib/colors/radix"
import { IconButton } from "~/ui/components/IconButton"
import { CalloutContent } from "./content"

type CalloutBlockViewProps = {
  data: CalloutBlock
  onDelete: () => void
}

export const CalloutBlockView = ({ data, onDelete }: CalloutBlockViewProps) => (
  <div
    className="flex w-full flex-col items-start gap-4 rounded-lg border border-solid px-4 py-4 my-2"
    style={{
      backgroundColor: elementBackground(data.color as RadixColor),
      borderColor: subtleBorder(data.color as RadixColor),
    }}
  >
    <div className="flex w-full items-start gap-3">
      <CalloutContent data={data} />
      <IconButton
        variant="neutral-tertiary"
        size="small"
        icon={<FeatherTrash2 />}
        onClick={onDelete}
      />
    </div>
  </div>
)
