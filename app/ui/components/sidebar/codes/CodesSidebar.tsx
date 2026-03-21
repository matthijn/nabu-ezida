"use client"

import { useState, useMemo } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { SidebarHeader } from "~/ui/components/sidebar/SidebarHeader"
import { matchesAny } from "~/lib/utils/filter"
import { solidBackground, elementBackground } from "~/ui/theme/radix"
import type { Codebook, Code, CodeCategory } from "./types"
import { CodeItem } from "./CodeItem"
import { CodeDetail } from "./CodeDetail"

interface CodesSidebarProps {
  codebook: Codebook
  onEditCode?: (code: Code) => void
  onFileSelect?: (fileId: string) => void
}

const filterCategories = (categories: CodeCategory[], query: string): CodeCategory[] => {
  if (query.length === 0) return categories
  return categories.reduce<CodeCategory[]>((acc, cat) => {
    const codes = cat.codes.filter((code) => matchesAny(query, [code.name, code.detail]))
    if (codes.length > 0) acc.push({ ...cat, codes })
    return acc
  }, [])
}

export const CodesSidebar = ({ codebook, onEditCode, onFileSelect }: CodesSidebarProps) => {
  const [searchValue, setSearchValue] = useState("")
  const [hoveredCode, setHoveredCode] = useState<Code | null>(null)

  const filteredCategories = useMemo(
    () => filterCategories(codebook.categories, searchValue),
    [codebook.categories, searchValue]
  )

  return (
    <div className="relative z-10 flex h-full w-56 flex-none flex-col items-start bg-default-background shadow-lg">
      <SidebarHeader
        title="Codes"
        filterPlaceholder="Filter codes..."
        filterValue={searchValue}
        onFilterChange={setSearchValue}
        onNew={() => undefined}
      />

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
            </div>
            <CodeDetail code={hoveredCode} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
