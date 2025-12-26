import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from "react"
import { createRoot } from "react-dom/client"
import * as Popover from "@radix-ui/react-popover"
import { type SuggestionProps, type SuggestionKeyDownProps } from "@tiptap/suggestion"
import {
  type Participant,
  PARTICIPANTS,
  CURRENT_USER,
} from "~/domain/participant"
import { FeatherSparkles } from "@subframe/core"
import { Avatar } from "~/ui/components/Avatar"
import { IconWithBackground } from "~/ui/components/IconWithBackground"

const filterParticipants = (query: string): Participant[] =>
  PARTICIPANTS.filter((p) =>
    p.name.toLowerCase().startsWith(query.toLowerCase())
  )

type MentionListProps = {
  items: Participant[]
  command: (item: Participant) => void
}

type MentionListRef = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

const variantToHighlight: Record<string, string> = {
  brand: "bg-brand-50",
  neutral: "bg-neutral-50",
  error: "bg-error-50",
  success: "bg-success-50",
  warning: "bg-warning-50",
}

const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0)

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index]
        if (item) command(item)
      },
      [items, command]
    )

    useEffect(() => setSelectedIndex(0), [items])

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: SuggestionKeyDownProps) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((selectedIndex + items.length - 1) % items.length)
          return true
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((selectedIndex + 1) % items.length)
          return true
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex)
          return true
        }
        return false
      },
    }))

    if (items.length === 0) {
      return (
        <div className="bg-default-background border border-solid border-neutral-border rounded-lg shadow-lg px-3 py-2 text-body text-subtext-color">
          No results
        </div>
      )
    }

    return (
      <div className="flex w-full max-w-[288px] flex-col items-start rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg overflow-hidden">
        {items.map((item, index) => (
          <button
            key={item.id}
            onClick={() => selectItem(index)}
            className={`flex w-full items-center gap-3 px-3 py-2 text-left cursor-pointer hover:bg-neutral-50 ${
              index === selectedIndex ? variantToHighlight[item.variant] : ""
            }`}
          >
            {item.type === "llm" ? (
              <IconWithBackground
                variant={item.variant}
                size="small"
                icon={<FeatherSparkles />}
              />
            ) : (
              <Avatar variant={item.variant} size="small">
                {item.initial}
              </Avatar>
            )}
            <div className="flex grow shrink-0 basis-0 flex-col items-start">
              <span className="text-body-bold font-body-bold text-default-font">
                {item.name}
              </span>
              <span className="text-caption font-caption text-subtext-color">
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    )
  }
)

MentionList.displayName = "MentionList"

type PopoverWrapperProps = {
  clientRect: (() => DOMRect | null) | null | undefined
  items: Participant[]
  command: (item: Participant) => void
  onKeyDown: React.MutableRefObject<((props: SuggestionKeyDownProps) => boolean) | null>
}

const PopoverWrapper = ({ clientRect, items, command, onKeyDown }: PopoverWrapperProps) => {
  const rect = clientRect?.()
  if (!rect) return null

  return (
    <Popover.Root open>
      <Popover.Anchor
        style={{
          position: "fixed",
          left: rect.left,
          top: rect.bottom,
          width: 1,
          height: 1,
        }}
      />
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <MentionList
            items={items}
            command={command}
            ref={(el) => {
              if (el) onKeyDown.current = el.onKeyDown
            }}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export const mentionSuggestion = {
  items: ({ query }: { query: string }) => filterParticipants(query),

  render: () => {
    let container: HTMLElement | null = null
    let root: ReturnType<typeof createRoot> | null = null
    let onKeyDownRef: React.MutableRefObject<((props: SuggestionKeyDownProps) => boolean) | null> = { current: null }

    return {
      onStart: (props: SuggestionProps<Participant>) => {
        container = document.createElement("div")
        document.body.appendChild(container)
        root = createRoot(container)
        root.render(
          <PopoverWrapper
            clientRect={props.clientRect}
            items={props.items as Participant[]}
            command={props.command}
            onKeyDown={onKeyDownRef}
          />
        )
      },

      onUpdate: (props: SuggestionProps<Participant>) => {
        root?.render(
          <PopoverWrapper
            clientRect={props.clientRect}
            items={props.items as Participant[]}
            command={props.command}
            onKeyDown={onKeyDownRef}
          />
        )
      },

      onKeyDown: (props: SuggestionKeyDownProps) => {
        if (props.event.key === "Escape") {
          return true
        }
        return onKeyDownRef.current?.(props) ?? false
      },

      onExit: () => {
        root?.unmount()
        container?.remove()
      },
    }
  },

  command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
    const participant = props as Participant
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent({
        type: "nabuQuestion",
        attrs: {
          initiator: CURRENT_USER,
          recipient: participant,
          messages: [],
          draft: "",
        },
      })
      .run()
  },
}
