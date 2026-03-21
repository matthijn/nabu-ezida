"use client"

import { FeatherSearch } from "@subframe/core"
import { TextField } from "~/ui/components/TextField"
import { cn } from "~/ui/utils"

interface TagOption {
  id: string
  label: string
}

interface SearchHeaderProps {
  title: string
  description: string
  tags: TagOption[]
  activeTags: Set<string>
  onToggleTag: (id: string) => void
}

const TagPill = ({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) => (
  <button
    type="button"
    className={cn(
      "cursor-pointer rounded-md border-none px-2 py-1 text-caption-bold font-caption-bold transition-colors",
      active
        ? "bg-default-background text-default-font shadow-sm"
        : "bg-transparent text-subtext-color hover:text-default-font"
    )}
    onClick={onClick}
  >
    {label}
  </button>
)

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
      <div className="flex w-full flex-col items-start gap-2 rounded-xl border border-solid border-neutral-300 px-4 py-3 shadow-lg">
        <div className="flex w-full items-center gap-3">
          <FeatherSearch className="text-[24px] leading-[36px] text-neutral-400" />
          <TextField
            className="h-auto grow shrink-0 basis-0 [&_div]:border-none [&_div]:bg-transparent"
            variant="outline"
            label=""
            helpText=""
            icon={null}
            disabled
          >
            <TextField.Input className="text-[18px] leading-[28px]" value={description} disabled />
          </TextField>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="flex items-center gap-3">
          <span className="text-body font-body text-subtext-color">Filter by tag:</span>
          <div className="flex items-center gap-0.5 rounded-md bg-neutral-100 px-0.5 py-0.5">
            {tags.map((tag) => (
              <TagPill
                key={tag.id}
                label={tag.label}
                active={activeTags.has(tag.id)}
                onClick={() => onToggleTag(tag.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  </div>
)
