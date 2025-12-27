"use client";

import type { ReactNode } from "react";
import { Button } from "~/ui/components/Button";
import { Avatar } from "~/ui/components/Avatar";
import { AutoScroll } from "~/ui/components/AutoScroll";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { FeatherSend, FeatherX, FeatherSparkles } from "@subframe/core";
import type { Participant, ParticipantVariant } from "~/domain/participant";

type ParticipantAvatarProps = {
  participant: Participant;
};

const ParticipantAvatar = ({ participant }: ParticipantAvatarProps) =>
  participant.type === "llm" ? (
    <IconWithBackground variant={participant.variant} size="small" icon={<FeatherSparkles />} />
  ) : (
    <Avatar variant={participant.variant} size="small">
      {participant.initial}
    </Avatar>
  );

type ConversationHeaderProps = {
  initiator: Participant;
  recipient: Participant;
};

const ConversationHeader = ({ initiator, recipient }: ConversationHeaderProps) => (
  <div className="flex w-full items-center gap-2 pb-2 border-b border-neutral-border">
    <ParticipantAvatar participant={initiator} />
    <span className="text-caption font-caption text-subtext-color">{initiator.name}</span>
    <span className="text-caption font-caption text-subtext-color">→</span>
    <ParticipantAvatar participant={recipient} />
    <span className="text-caption-bold font-caption-bold text-default-font">{recipient.name}</span>
  </div>
);

type ChatActionsProps = {
  onSend: () => void;
  onCancel: () => void;
};

const ChatActions = ({ onSend, onCancel }: ChatActionsProps) => (
  <div className="flex w-full items-center justify-end gap-2 pt-2">
    <Button variant="neutral-tertiary" size="small" icon={<FeatherX />} onClick={onCancel}>
      Cancel
    </Button>
    <Button variant="brand-primary" size="small" icon={<FeatherSend />} onClick={onSend}>
      Send
    </Button>
  </div>
);

type ProgressFooterProps = {
  onCancel: () => void;
};

const ProgressFooter = ({ onCancel }: ProgressFooterProps) => (
  <div className="flex w-full items-center justify-end gap-2">
    <Button variant="neutral-secondary" size="small" icon={<FeatherX />} onClick={onCancel}>
      Cancel
    </Button>
  </div>
);

type ConversationProps =
  | {
      initiator: Participant;
      recipient: Participant;
      mode: "chat";
      onSend: () => void;
      onCancel: () => void;
      onClick?: () => void;
      children: ReactNode;
      className?: string;
    }
  | {
      initiator: Participant;
      recipient: Participant;
      mode: "progress";
      onCancel: () => void;
      onClick?: () => void;
      children: ReactNode;
      className?: string;
    };

const variantToBorder: Record<ParticipantVariant, string> = {
  brand: "border-brand-400",
  neutral: "border-neutral-400",
  error: "border-error-400",
  success: "border-success-400",
  warning: "border-warning-400",
}

const variantToBg: Record<ParticipantVariant, string> = {
  brand: "bg-brand-50",
  neutral: "bg-neutral-50",
  error: "bg-error-50",
  success: "bg-success-50",
  warning: "bg-warning-50",
}

export const Conversation = (props: ConversationProps) => {
  const { initiator, recipient, mode, children, className = "", onClick } = props;

  return (
    <div
      onClick={onClick}
      className={`flex w-full max-h-[600px] flex-col rounded-lg border-2 border-solid px-4 py-4 ${variantToBorder[recipient.variant]} ${variantToBg[recipient.variant]} ${className}`}
    >
      <ConversationHeader initiator={initiator} recipient={recipient} />
      <AutoScroll className="flex-1 overflow-y-auto flex flex-col gap-3 py-3">
        {children}
      </AutoScroll>
      {mode === "chat" ? (
        <ChatActions onSend={props.onSend} onCancel={props.onCancel} />
      ) : (
        <ProgressFooter onCancel={props.onCancel} />
      )}
    </div>
  );
};
