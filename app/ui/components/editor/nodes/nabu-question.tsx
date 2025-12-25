import { useState, useCallback, type KeyboardEvent } from "react"
import type { NodeViewProps } from "@tiptap/react"
import { Conversation, Message } from "~/ui/components/ai"
import { type Participant } from "~/domain/participant"
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled"

type ConversationMessage = {
  from: Participant
  content: string
}

export const NabuQuestionView = ({ node, updateAttributes }: NodeViewProps) => {
  const [inputValue, setInputValue] = useState(node.attrs.draft ?? "")
  const messages: ConversationMessage[] = node.attrs.messages ?? []
  const initiator: Participant = node.attrs.initiator
  const recipient: Participant = node.attrs.recipient

  const updateDraft = useCallback(
    (value: string) => {
      setInputValue(value)
      updateAttributes({ draft: value })
    },
    [updateAttributes]
  )

  const handleSend = useCallback(() => {
    if (!inputValue.trim()) return

    const newMessage: ConversationMessage = {
      from: initiator,
      content: inputValue.trim(),
    }

    updateAttributes({
      messages: [...messages, newMessage],
      draft: "",
    })
    setInputValue("")
  }, [inputValue, messages, initiator, updateAttributes])

  const handleCancel = useCallback(() => {
    setInputValue("")
    updateAttributes({ draft: "" })
  }, [updateAttributes])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="my-4" contentEditable={false}>
      <Conversation
        initiator={initiator}
        recipient={recipient}
        mode="chat"
        onSend={handleSend}
        onCancel={handleCancel}
      >
        {messages.map((msg, i) => (
          <Message key={i} from={msg.from}>
            <span className="text-body font-body text-default-font">
              {msg.content}
            </span>
          </Message>
        ))}
        <Message from={initiator}>
          <TextFieldUnstyled className="h-auto w-full flex-none">
            <TextFieldUnstyled.Input
              placeholder={`Message ${recipient.name}...`}
              value={inputValue}
              onChange={(e) => updateDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </TextFieldUnstyled>
        </Message>
      </Conversation>
    </div>
  )
}
