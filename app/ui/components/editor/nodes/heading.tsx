import { useState } from "react"
import { NodeViewContent, type NodeViewProps } from "@tiptap/react"
import * as Popover from "@radix-ui/react-popover"
import {
  BLOCK_COLORS,
  solidBackground,
  elementBackground,
  type RadixColor,
} from "~/lib/colors/radix"
import { useEditorDocument } from "../context"
import { useCommand } from "~/lib/api/useCommand"
import { documentCommands } from "~/domain/api/commands/document"

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6
const HEADING_TAGS: Record<HeadingLevel, string> = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
  6: "h6",
}

const chunkArray = <T,>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  )

const COLOR_ROWS = chunkArray(BLOCK_COLORS, 8)

type ColorSwatchProps = {
  color: RadixColor
  isSelected: boolean
  onSelect: (color: RadixColor | null) => void
}

const ColorSwatch = ({ color, isSelected, onSelect }: ColorSwatchProps) => (
  <button
    type="button"
    onClick={() => onSelect(isSelected ? null : color)}
    className="h-6 w-6 rounded-md border border-neutral-200 cursor-pointer hover:scale-110 transition-transform"
    style={{ background: solidBackground(color) }}
    title={color}
  />
)

type ColorPickerProps = {
  selected: RadixColor | null
  onSelect: (color: RadixColor | null) => void
}

const ClearSwatch = ({ onSelect }: { onSelect: () => void }) => (
  <button
    type="button"
    onClick={onSelect}
    className="h-6 w-6 rounded-md border border-neutral-300 cursor-pointer hover:scale-110 transition-transform bg-white relative overflow-hidden"
    title="Clear color"
  >
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="w-[140%] h-0.5 bg-red-500 rotate-45" />
    </div>
  </button>
)

const ColorPicker = ({ selected, onSelect }: ColorPickerProps) => (
  <div className="flex flex-col gap-2 p-3 rounded-lg border border-neutral-border bg-default-background shadow-lg">
    {COLOR_ROWS.map((row, i) => (
      <div key={i} className="flex gap-2">
        {row.map((color) => (
          <ColorSwatch
            key={color}
            color={color}
            isSelected={selected === color}
            onSelect={onSelect}
          />
        ))}
        {i === COLOR_ROWS.length - 1 && <ClearSwatch onSelect={() => onSelect(null)} />}
      </div>
    ))}
  </div>
)

type ColorDotProps = {
  color: RadixColor | null
  onColorChange: (color: RadixColor | null) => void
}

const ColorDot = ({ color, onColorChange }: ColorDotProps) => {
  const [open, setOpen] = useState(false)
  const hasColor = color !== null

  const handleSelect = (newColor: RadixColor | null) => {
    onColorChange(newColor)
    setOpen(false)
  }

  const handleMouseEnter = () => setOpen(true)
  const handleMouseLeave = () => setOpen(false)

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          contentEditable={false}
          onMouseEnter={handleMouseEnter}
          className={`absolute -left-7 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full cursor-pointer transition-opacity hover:opacity-100 group-hover:opacity-100 ${hasColor ? "opacity-100" : "opacity-0"}`}
          style={hasColor ? { background: solidBackground(color) } : { background: "var(--gray-6)" }}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={8}
          className="z-50"
          onMouseLeave={handleMouseLeave}
        >
          <ColorPicker selected={color} onSelect={handleSelect} />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const HeadingView = ({ node }: NodeViewProps) => {
  const level = node.attrs.level as HeadingLevel
  const tag = HEADING_TAGS[level] as "div"
  const backgroundColor = node.attrs.backgroundColor as RadixColor | null
  const blockId = node.attrs.blockId as string | undefined

  const editorDoc = useEditorDocument()
  const { execute } = useCommand()

  const handleColorChange = (color: RadixColor | null) => {
    if (!editorDoc || !blockId) return
    execute(documentCommands.update_block({
      document_id: editorDoc.documentId,
      block_id: blockId,
      props: { background_color: color },
    }))
  }

  return (
    <div className="group relative">
      <ColorDot color={backgroundColor} onColorChange={handleColorChange} />
      <NodeViewContent
        as={tag}
        className="rounded-md px-3 py-1"
        style={backgroundColor ? { background: elementBackground(backgroundColor) } : undefined}
      />
    </div>
  )
}
