"use client"

export type DocumentItemProps = {
  title: string
  editedAt: string
  selected?: boolean
  onClick?: () => void
}

export function DocumentItem({ title, editedAt, selected = false, onClick }: DocumentItemProps) {
  return (
    <div
      className={`flex w-full flex-col items-start gap-1 px-3 py-2 cursor-pointer relative ${
        selected ? "bg-brand-100/50" : "hover:bg-neutral-50"
      }`}
      onClick={onClick}
    >
      {selected && (
        <div className="flex w-1 flex-col items-center gap-2 bg-brand-600 absolute left-0 top-0 bottom-0" />
      )}
      <span className={`line-clamp-1 ${selected ? "text-body-bold font-body-bold" : "text-body font-body"} text-default-font`}>
        {title}
      </span>
      <span className="text-caption font-caption text-subtext-color">
        {editedAt}
      </span>
    </div>
  )
}
