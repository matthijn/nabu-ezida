"use client";

import type { ReactNode } from "react";
import { Button } from "~/ui/components/Button";
import { FeatherMessageCircle, FeatherSend, FeatherX, FeatherSparkles } from "@subframe/core";
import type { Participant } from "~/domain/participant";

type ParticipantAvatarProps = {
  participant: Participant;
};

const ParticipantAvatar = ({ participant }: ParticipantAvatarProps) =>
  participant.type === "llm" ? (
    <div
      className="flex flex-none items-center justify-center rounded-full w-6 h-6"
      style={{ backgroundColor: `${participant.color}20` }}
    >
      <FeatherSparkles className="w-3.5 h-3.5" style={{ color: participant.color }} />
    </div>
  ) : (
    <div
      className="flex flex-none items-center justify-center rounded-full w-6 h-6 font-semibold text-[10px]"
      style={{ backgroundColor: `${participant.color}20`, color: participant.color }}
    >
      {participant.initial}
    </div>
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

export const Conversation = (props: ConversationProps) => {
  const { initiator, recipient, mode, children, className = "" } = props;

  return (
    <div
      className={`flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid px-4 py-4 ${className}`}
      style={{
        borderColor: recipient.color,
        backgroundColor: `${recipient.color}10`,
      }}
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
