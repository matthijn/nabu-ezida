"use client"

import React from "react"
import { IconWithBackground } from "~/ui/components/IconWithBackground"
import { Badge } from "~/ui/components/Badge"
import { FeatherUploadCloud, FeatherFileText, FeatherImage } from "@subframe/core"

type DropZoneProps = {
  variant: "full" | "compact"
  isDragging: boolean
  dragHandlers: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

const FullDropZone = ({ isDragging, dragHandlers }: Omit<DropZoneProps, "variant">) => (
  <div
    className={`flex w-full flex-col items-center justify-center gap-6 rounded-lg border-4 border-dashed px-12 py-24 transition-colors ${
      isDragging
        ? "border-brand-600 bg-brand-100"
        : "border-brand-600 bg-brand-50"
    }`}
    {...dragHandlers}
  >
    <IconWithBackground
      variant="brand"
      size="x-large"
      icon={<FeatherUploadCloud />}
    />
    <div className="flex flex-col items-center justify-center gap-3">
      <span className="text-heading-1 font-heading-1 text-default-font text-center">
        Drop files to analyze and import
      </span>
      <span className="text-body font-body text-subtext-color text-center">
        We&#39;ll automatically extract text, identify citations, and categorize your documents
      </span>
    </div>
    <div className="flex items-center gap-2">
      <Badge variant="brand" icon={<FeatherFileText />}>
        MD
      </Badge>
      <Badge variant="neutral" icon={<FeatherFileText />}>
        PDF
      </Badge>
      <Badge variant="neutral" icon={<FeatherFileText />}>
        DOCX
      </Badge>
      <Badge variant="neutral" icon={<FeatherImage />}>
        Images
      </Badge>
    </div>
    <span className="text-caption font-caption text-subtext-color">
      Only Markdown (.md) files are currently supported
    </span>
  </div>
)

const CompactDropZone = ({ isDragging, dragHandlers }: Omit<DropZoneProps, "variant">) => (
  <div
    className={`flex w-full items-center justify-center gap-4 rounded-lg border-2 border-dashed px-6 py-4 transition-colors ${
      isDragging
        ? "border-brand-600 bg-brand-100"
        : "border-brand-400 bg-brand-50"
    }`}
    {...dragHandlers}
  >
    <FeatherUploadCloud className="text-heading-3 font-heading-3 text-brand-600" />
    <span className="text-body font-body text-default-font">
      Drop more files to add them to the import queue
    </span>
  </div>
)

export const DropZone = ({ variant, isDragging, dragHandlers }: DropZoneProps) =>
  variant === "full" ? (
    <FullDropZone isDragging={isDragging} dragHandlers={dragHandlers} />
  ) : (
    <CompactDropZone isDragging={isDragging} dragHandlers={dragHandlers} />
  )
