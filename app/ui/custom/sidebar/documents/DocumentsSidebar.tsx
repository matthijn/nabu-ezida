"use client";
import { AnimatePresence } from "framer-motion";
import { FeatherChevronsLeft, FeatherChevronsRight, FeatherSearch, FeatherPlus } from "@subframe/core";
import { IconButton } from "~/ui/components/IconButton";
import { TextField } from "~/ui/components/TextField";
import { ToggleGroup } from "~/ui/components/ToggleGroup";
import { Button } from "~/ui/components/Button";
import { AnimatedListItem } from "~/ui/components/AnimatedListItem";
import { SectionHeader } from "./SectionHeader";
import { DocumentItem } from "./DocumentItem";

export interface Document {
  id: string;
  title: string;
  editedAt: string;
  tags: Array<{ label: string; variant?: "brand" | "neutral" }>;
  pinned?: boolean;
}

interface DocumentsSidebarProps {
  documents: Document[];
  selectedId?: string;
  searchValue?: string;
  sortBy?: "modified" | "name";
  collapsed?: boolean;
  onSearchChange?: (value: string) => void;
  onSortChange?: (sort: "modified" | "name") => void;
  onDocumentSelect?: (id: string) => void;
  onNewDocument?: () => void;
  onCollapse?: () => void;
  onExpand?: () => void;
}

export function DocumentsSidebar({
  documents,
  selectedId,
  searchValue = "",
  sortBy = "modified",
  collapsed = false,
  onSearchChange,
  onSortChange,
  onDocumentSelect,
  onNewDocument,
  onCollapse,
  onExpand,
}: DocumentsSidebarProps) {
  const pinnedDocs = documents.filter((d) => d.pinned);
  const allDocs = documents.filter((d) => !d.pinned);

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
    );
  }

  return (
    <div className="flex w-72 flex-none flex-col items-start gap-4 self-stretch border-r border-solid border-neutral-border bg-default-background px-4 py-6 relative z-10">
      {onCollapse && (
        <IconButton
          className="absolute top-4 -right-[13px] z-50 cursor-pointer"
          variant="brand-secondary"
          size="small"
          icon={<FeatherChevronsLeft />}
          onClick={onCollapse}
        />
      )}

      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Documents
        </span>
        <TextField
          className="h-auto w-full flex-none"
          variant="filled"
          label=""
          helpText=""
          icon={<FeatherSearch />}
        >
          <TextField.Input
            placeholder="Filter"
            value={searchValue}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </TextField>
      </div>

      <div className="flex w-full items-center justify-between">
        <ToggleGroup
          value={sortBy === "modified" ? "modified" : "name"}
          onValueChange={(v) => onSortChange?.(v as "modified" | "name")}
        >
          <ToggleGroup.Item icon={null} value="modified">
            Modified
          </ToggleGroup.Item>
          <ToggleGroup.Item icon={null} value="name">
            Name
          </ToggleGroup.Item>
        </ToggleGroup>
        <Button
          variant="brand-primary"
          size="small"
          icon={<FeatherPlus />}
          onClick={onNewDocument}
        >
          New
        </Button>
      </div>

      <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 overflow-auto">
        {pinnedDocs.length > 0 && (
          <div className="flex w-full flex-col items-start gap-1">
            <SectionHeader>PINNED</SectionHeader>
            <AnimatePresence initial={false}>
              {pinnedDocs.map((doc) => (
                <AnimatedListItem key={doc.id}>
                  <DocumentItem
                    title={doc.title}
                    editedAt={doc.editedAt}
                    tags={doc.tags}
                    selected={doc.id === selectedId}
                    onClick={() => onDocumentSelect?.(doc.id)}
                  />
                </AnimatedListItem>
              ))}
            </AnimatePresence>
          </div>
        )}

        {allDocs.length > 0 && (
          <div className="flex w-full flex-col items-start gap-1">
            <SectionHeader>ALL DOCUMENTS</SectionHeader>
            <AnimatePresence initial={false}>
              {allDocs.map((doc) => (
                <AnimatedListItem key={doc.id}>
                  <DocumentItem
                    title={doc.title}
                    editedAt={doc.editedAt}
                    tags={doc.tags}
                    selected={doc.id === selectedId}
                    onClick={() => onDocumentSelect?.(doc.id)}
                  />
                </AnimatedListItem>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
