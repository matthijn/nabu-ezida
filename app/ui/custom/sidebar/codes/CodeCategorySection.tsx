"use client"

import { useState } from "react"
import { AnimatePresence } from "framer-motion"
import { FeatherChevronDown, FeatherChevronRight } from "@subframe/core"
import { AnimatedListItem } from "~/ui/components/AnimatedListItem"
import type { CodeCategory, Code } from "./types"
import { CodeItem } from "./CodeItem"

type CodeCategorySectionProps = {
  category: CodeCategory
  selectedCodeId?: string
  onCodeSelect?: (code: Code) => void
}

export const CodeCategorySection = ({
  category,
  selectedCodeId,
  onCodeSelect,
}: CodeCategorySectionProps) => {
  const [expanded, setExpanded] = useState(true)

  const toggleExpanded = () => setExpanded((prev) => !prev)

  return (
    <div className="flex w-full flex-col items-start gap-2">
      <div
        className="flex w-full cursor-pointer items-center gap-2 px-2 py-1"
        onClick={toggleExpanded}
      >
        {expanded ? (
          <FeatherChevronDown className="text-caption font-caption text-subtext-color" />
        ) : (
          <FeatherChevronRight className="text-caption font-caption text-subtext-color" />
        )}
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          {category.name.toUpperCase()}
        </span>
      </div>
      <AnimatePresence initial={false}>
        {expanded &&
          category.codes.map((code) => (
            <AnimatedListItem key={code.id}>
              <CodeItem
                code={code}
                selected={code.id === selectedCodeId}
                onClick={() => onCodeSelect?.(code)}
              />
            </AnimatedListItem>
          ))}
      </AnimatePresence>
    </div>
  )
}
