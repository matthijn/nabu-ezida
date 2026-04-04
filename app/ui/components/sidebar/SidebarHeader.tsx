"use client"

import { Search, Plus } from "lucide-react"
import { Button } from "~/ui/components/Button"
import { TextField } from "~/ui/components/TextField"

interface SidebarHeaderProps {
  title: string
  filterPlaceholder: string
  filterValue: string
  onFilterChange: (value: string) => void
  onNew?: () => void
}

export const SidebarHeader = ({
  title,
  filterPlaceholder,
  filterValue,
  onFilterChange,
  onNew,
}: SidebarHeaderProps) => (
  <div className="flex w-full flex-col items-start gap-2 border-b border-solid border-neutral-border px-4 py-4">
    <div className="flex w-full items-center justify-between">
      <span className="text-heading-2 font-heading-2 text-default-font">{title}</span>
      {onNew && <Button variant="brand-primary" size="small" icon={<Plus />} onClick={onNew} />}
    </div>
    <TextField
      className="h-auto w-full flex-none"
      variant="filled"
      label=""
      helpText=""
      icon={<Search />}
    >
      <TextField.Input
        placeholder={filterPlaceholder}
        value={filterValue}
        onChange={(e) => onFilterChange(e.target.value)}
      />
    </TextField>
  </div>
)
