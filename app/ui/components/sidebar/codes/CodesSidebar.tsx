"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { FeatherChevronRight, FeatherFlag, FeatherSearch } from "@subframe/core"
import { Badge } from "~/ui/components/Badge"
import { SidebarHeader } from "~/ui/components/sidebar/SidebarHeader"
import { matchesAny } from "~/lib/utils/filter"
import { solidBackground, elementBackground } from "~/ui/theme/radix"
import type { Codebook, Code, CodeCategory } from "./types"
import { CodeItem } from "./CodeItem"
import { CodeDetail } from "./CodeDetail"

interface CodesSidebarProps {
  codebook: Codebook
  reviewCount?: number
  onEditCode?: (code: Code) => void
  onFileSelect?: (fileId: string) => void
  onSearchCode?: (code: Code) => void
  onReviewClick?: () => void
}

const filterCategories = (categories: CodeCategory[], query: string): CodeCategory[] => {
  if (query.length === 0) return categories
  return categories.reduce<CodeCategory[]>((acc, cat) => {
    const codes = cat.codes.filter((code) => matchesAny(query, [code.name, code.detail]))
    if (codes.length > 0) acc.push({ ...cat, codes })
    return acc
  }, [])
}

const NeedsReviewRow = ({ count, onClick }: { count: number; onClick?: () => void }) => (
  <>
    <div
      className="flex w-full items-center gap-2 px-4 py-2.5 cursor-pointer hover:bg-neutral-50"
      onClick={onClick}
    >
      <FeatherFlag className="h-4 w-4 flex-none text-warning-600" />
      <span className="grow shrink-0 basis-0 text-body font-body text-default-font">
        Needs review
      </span>
      <Badge variant="warning">{count}</Badge>
      <FeatherChevronRight className="h-3.5 w-3.5 flex-none text-subtext-color" />
    </div>
    <div className="flex h-px w-full flex-none bg-neutral-border" />
  </>
)

export const CodesSidebar = ({
  codebook,
  reviewCount = 0,
  onEditCode,
  onFileSelect,
  onSearchCode,
  onReviewClick,
}: CodesSidebarProps) => {
  const [searchValue, setSearchValue] = useState("")
  const [hoveredCode, setHoveredCode] = useState<Code | null>(null)

  const filteredCategories = useMemo(
    () => filterCategories(codebook.categories, searchValue),
    [codebook.categories, searchValue]
  )

  return (
    <div className="relative z-10 flex h-full w-56 flex-none flex-col items-start bg-default-background shadow-lg">
      <div className="flex w-full flex-none flex-col" onMouseEnter={() => setHoveredCode(null)}>
        <SidebarHeader
          title="Codes"
          filterPlaceholder="Filter codes..."
          filterValue={searchValue}
          onFilterChange={setSearchValue}
          onNew={() => undefined}
        />
        {reviewCount > 0 && <NeedsReviewRow count={reviewCount} onClick={onReviewClick} />}
      </div>

      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 px-4 py-4 overflow-auto">
        {filteredCategories.map((category) => (
          <div key={category.fileId} className="flex w-full flex-col items-start gap-2">
            <span
              className="text-caption-bold font-caption-bold text-subtext-color px-2 cursor-pointer hover:text-default-font"
              onClick={() => onFileSelect?.(category.fileId)}
            >
              {category.name}
            </span>
            {category.codes.map((code) => (
              <CodeItem
                key={code.id}
                code={code}
                highlighted={code.id === hoveredCode?.id}
                onMouseEnter={() => setHoveredCode(code)}
                onClick={() => onEditCode?.(code)}
              />
            ))}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {hoveredCode && (
          <motion.div
            key="code-detail-panel"
            initial={{ x: -12, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="absolute left-full top-0 h-full w-80 flex flex-col items-start bg-default-background [box-shadow:4px_0_6px_-1px_rgb(0_0_0/0.1),4px_0_4px_-2px_rgb(0_0_0/0.1)]"
          >
            <div
              className="flex w-full items-center gap-2 border-b-2 border-solid px-4 py-4"
              style={{
                backgroundColor: elementBackground(hoveredCode.color),
                borderColor: solidBackground(hoveredCode.color),
              }}
            >
              <div
                className="flex h-3 w-3 flex-none rounded-full"
                style={{ backgroundColor: solidBackground(hoveredCode.color) }}
              />
              <span className="text-heading-3 font-heading-3 text-default-font">
                {hoveredCode.name}
              </span>
              <button
                className="ml-auto flex-none cursor-pointer"
                style={{ color: solidBackground(hoveredCode.color) }}
                onClick={() => onSearchCode?.(hoveredCode)}
              >
                <FeatherSearch className="h-4 w-4" />
              </button>
            </div>
            <CodeDetail code={hoveredCode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
