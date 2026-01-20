"use client"

import { useState } from "react"
import {
  FeatherChevronsLeft,
  FeatherChevronsRight,
  FeatherSearch,
  FeatherPlus,
} from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { TextField } from "~/ui/components/TextField"
import type { Codebook, Code } from "./types"
import { CodeCategorySection } from "./CodeCategorySection"
import { CodeDetail } from "./CodeDetail"

type CodesSidebarProps = {
  codebook: Codebook
  collapsed?: boolean
  onCollapse?: () => void
  onExpand?: () => void
}

const getFirstCode = (codebook: Codebook): Code | null =>
  codebook.categories[0]?.codes[0] ?? null

export const CodesSidebar = ({
  codebook,
  collapsed = false,
  onCollapse,
  onExpand,
}: CodesSidebarProps) => {
  const [searchValue, setSearchValue] = useState("")
  const [selectedCode, setSelectedCode] = useState<Code | null>(() => getFirstCode(codebook))

  const handleCodeSelect = (code: Code) => {
    setSelectedCode(code.id === selectedCode?.id ? null : code)
  }

  if (collapsed) {
    return (
      <div className="flex flex-none self-stretch border-r border-solid border-neutral-border bg-default-background relative z-10">
        {onExpand && (
          <IconButton
            className="absolute top-4 -right-[13px] z-50 cursor-pointer"
            variant="brand-secondary"
            size="small"
            icon={<FeatherChevronsRight />}
            onClick={onExpand}
          />
        )}
      </div>
    )
  }

  return (
    <div className="flex w-72 flex-none flex-col items-start self-stretch border-r border-solid border-neutral-border bg-default-background relative z-10">
      {onCollapse && (
        <IconButton
          className="absolute top-4 -right-[13px] z-50 cursor-pointer"
          variant="brand-secondary"
          size="small"
          icon={<FeatherChevronsLeft />}
          onClick={onCollapse}
        />
      )}

      <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-2 font-heading-2 text-default-font">
            Codes
          </span>
          <IconButton size="small" icon={<FeatherPlus />} onClick={() => {}} />
        </div>
        <TextField
          className="h-auto w-full flex-none"
          variant="filled"
          label=""
          helpText=""
          icon={<FeatherSearch />}
        >
          <TextField.Input
            placeholder="Search codes..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </TextField>
      </div>

      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-4 py-4 overflow-auto">
        {codebook.categories.map((category) => (
          <CodeCategorySection
            key={category.name}
            category={category}
            selectedCodeId={selectedCode?.id}
            onCodeSelect={handleCodeSelect}
          />
        ))}
      </div>

      {selectedCode && (
        <CodeDetail code={selectedCode} onEdit={() => {}} />
      )}
    </div>
  )
}
