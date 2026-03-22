"use client"

import { FeatherSearch } from "@subframe/core"
import type { TagDefinition } from "~/domain/data-blocks/settings/schema"
import { TextField } from "~/ui/components/TextField"
import { TagBadge } from "~/ui/components/TagBadge"

interface SearchHeaderProps {
  title: string
  description: string
  tags: TagDefinition[]
  activeTags: Set<string>
  onToggleTag: (id: string) => void
}

export const SearchHeader = ({
  title,
  description,
  tags,
  activeTags,
  onToggleTag,
}: SearchHeaderProps) => (
  <div className="flex w-full flex-col items-center gap-8 py-12">
    <span className="text-heading-1 font-heading-1 text-default-font">{title}</span>
    <div className="flex w-full max-w-[768px] flex-col items-center gap-4">
      <div className="flex w-full flex-col items-start rounded-lg border border-solid border-neutral-300 px-3 py-2 shadow-sm">
        <div className="flex w-full items-center gap-2">
          <FeatherSearch className="text-[16px] leading-[24px] text-neutral-400" />
          <TextField
            className="h-auto grow shrink-0 basis-0 [&_div]:border-none [&_div]:bg-transparent"
            variant="outline"
            label=""
            helpText=""
            icon={null}
            disabled
          >
            <TextField.Input className="text-[14px] leading-[20px]" value={description} disabled />
          </TextField>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-body font-body text-subtext-color">Filter by tag:</span>
          {tags.map((tag) => {
            const active = activeTags.has(tag.id)
            const isLastActive = active && activeTags.size === 1
            return (
              <TagBadge
                key={tag.id}
                tag={tag}
                active={active}
                disabled={isLastActive}
                onClick={() => onToggleTag(tag.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  </div>
)
