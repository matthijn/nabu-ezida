"use client"

import { useState } from "react"
import { FeatherChevronDown, FeatherChevronRight } from "@subframe/core"
import type { CodeCategory, Code } from "./types"
import { CodeItem } from "./CodeItem"

type CodeCategorySectionProps = {
  category: CodeCategory
  hoveredCodeId?: string
  onCodeHover?: (code: Code | null) => void
  onCodeClick?: (code: Code) => void
}

export const CodeCategorySection = ({
  category,
  hoveredCodeId,
  onCodeHover,
  onCodeClick,
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
      {expanded &&
        category.codes.map((code) => (
          <CodeItem
            key={code.id}
            code={code}
            highlighted={code.id === hoveredCodeId}
            onMouseEnter={() => onCodeHover?.(code)}
            onClick={() => onCodeClick?.(code)}
          />
        ))}
    </div>
  )
}
