"use client"

import { useState, useMemo } from "react"
import {
  FeatherSearch,
  FeatherPlus,
} from "@subframe/core"
import { IconButton } from "~/ui/components/IconButton"
import { TextField } from "~/ui/components/TextField"
import { matchesAny } from "~/lib/filter"
import type { Codebook, Code, CodeCategory } from "./types"
import { CodeCategorySection } from "./CodeCategorySection"
import { CodeDetail } from "./CodeDetail"

type CodesSidebarProps = {
  codebook: Codebook
  onEditCode?: (code: Code) => void
}

const getFirstCode = (codebook: Codebook): Code | null =>
  codebook.categories[0]?.codes[0] ?? null

const filterCode = (code: Code, query: string): boolean =>
  matchesAny(query, [code.name, code.detail])

const filterCategory = (category: CodeCategory, query: string): CodeCategory => ({
  ...category,
  codes: category.codes.filter((code) => filterCode(code, query)),
})

const filterCodebook = (codebook: Codebook, query: string): CodeCategory[] =>
  codebook.categories
    .map((cat) => filterCategory(cat, query))
    .filter((cat) => cat.codes.length > 0)

export const CodesSidebar = ({
  codebook,
  onEditCode,
}: CodesSidebarProps) => {
  const [searchValue, setSearchValue] = useState("")
  const [selectedCode, setSelectedCode] = useState<Code | null>(() => getFirstCode(codebook))

  const filteredCategories = useMemo(
    () => filterCodebook(codebook, searchValue),
    [codebook, searchValue]
  )

  const handleCodeSelect = (code: Code) => {
    setSelectedCode(code.id === selectedCode?.id ? null : code)
  }

  return (
    <div className="flex h-full w-72 flex-none flex-col items-start bg-default-background">

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
        {filteredCategories.map((category) => (
          <CodeCategorySection
            key={category.name}
            category={category}
            selectedCodeId={selectedCode?.id}
            onCodeSelect={handleCodeSelect}
          />
        ))}
      </div>

      {selectedCode && (
        <CodeDetail code={selectedCode} onEdit={onEditCode ? () => onEditCode(selectedCode) : undefined} />
      )}
    </div>
  )
}
