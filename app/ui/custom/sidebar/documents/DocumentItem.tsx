"use client";

import React from "react";
import { Badge } from "~/ui/components/Badge";

interface DocumentItemProps {
  title: string;
  editedAt: string;
  tags: Array<{ label: string; variant?: "brand" | "neutral" }>;
  selected?: boolean;
  onClick?: () => void;
}

export function DocumentItem({
  title,
  editedAt,
  tags,
  selected = false,
  onClick,
}: DocumentItemProps) {
  return (
    <div
      className={`flex w-full cursor-pointer flex-col items-start gap-3 rounded-md px-4 py-4 ${
        selected ? "bg-brand-50" : "bg-neutral-50"
      }`}
      onClick={onClick}
    >
      <div className="flex w-full flex-col items-start gap-2">
        <span
          className={`${
            selected ? "text-body-bold font-body-bold" : "text-body font-body"
          } text-default-font`}
        >
          {title}
        </span>
        <div className="flex w-full flex-wrap items-center gap-2">
          <span className="text-caption font-caption text-subtext-color">
            {editedAt}
          </span>
          {tags.map((tag, i) => (
            <Badge key={i} variant={tag.variant ?? "neutral"} icon={null}>
              {tag.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
