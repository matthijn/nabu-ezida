"use client"

import { FeatherTrash2 } from "@subframe/core"
import type { CalloutBlock } from "~/domain/blocks/callout"
import type { RadixColor } from "~/lib/colors/radix"
import { solidBackground } from "~/lib/colors/radix"
import { IconButton } from "~/ui/components/IconButton"
import { CalloutContent } from "./content"

type CalloutBlockViewProps = {
  data: CalloutBlock
  onDelete: () => void
}

export const CalloutBlockView = ({ data, onDelete }: CalloutBlockViewProps) => (
  <div className="flex w-full items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background relative my-2">
    <div
      className="flex w-1 flex-none absolute left-0 top-0 bottom-0"
      style={{ backgroundColor: solidBackground(data.color as RadixColor) }}
    />
    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-4 pl-5 pr-4 py-4">
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
  </div>
)
