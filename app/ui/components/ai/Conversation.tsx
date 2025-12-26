"use client";

import type { ReactNode } from "react";
import { Button } from "~/ui/components/Button";
import { Avatar } from "~/ui/components/Avatar";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { FeatherMessageCircle, FeatherSend, FeatherX, FeatherSparkles } from "@subframe/core";
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
  onFollowUp: () => void;
  onCancel: () => void;
};

const ProgressFooter = ({ onFollowUp, onCancel }: ProgressFooterProps) => (
  <div className="flex w-full items-center justify-end gap-2">
    <Button
      variant="neutral-tertiary"
      size="small"
      icon={<FeatherMessageCircle />}
      onClick={onFollowUp}
    >
      Follow up
    </Button>
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
      children: ReactNode;
      className?: string;
    }
  | {
      initiator: Participant;
      recipient: Participant;
      mode: "progress";
      onFollowUp: () => void;
      onCancel: () => void;
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
  const { initiator, recipient, mode, children, className = "" } = props;

  return (
    <div
      className={`flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid px-4 py-4 ${variantToBorder[recipient.variant]} ${variantToBg[recipient.variant]} ${className}`}
    >
      <ConversationHeader initiator={initiator} recipient={recipient} />
      {children}
      {mode === "chat" ? (
        <ChatActions onSend={props.onSend} onCancel={props.onCancel} />
      ) : (
        <ProgressFooter onFollowUp={props.onFollowUp} onCancel={props.onCancel} />
      )}
    </div>
  );
};
