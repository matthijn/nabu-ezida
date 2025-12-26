"use client";

import type { ReactNode } from "react";
import type { Participant } from "~/domain/participant";
import { Avatar } from "~/ui/components/Avatar";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { FeatherSparkles } from "@subframe/core";

type ParticipantAvatarProps = {
  participant: Participant;
  size: "x-small" | "small" | "medium";
};

const ParticipantAvatar = ({ participant, size }: ParticipantAvatarProps) =>
  participant.type === "llm" ? (
    <IconWithBackground variant={participant.variant} size={size} icon={<FeatherSparkles />} />
  ) : (
    <Avatar variant={participant.variant} size={size} image={participant.image}>
      {participant.initial}
    </Avatar>
  );

type MessageProps = {
  from: Participant;
  to?: Participant;
  children: ReactNode;
};

export const Message = ({ from, to, children }: MessageProps) => {
  const showTarget = to !== undefined;

  return (
    <div className="flex w-full items-start gap-3">
      <ParticipantAvatar participant={from} size="small" />
      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
        {showTarget ? (
          <div className="flex items-center gap-2">
            <span className="text-caption font-caption text-subtext-color">{from.name}</span>
            <span className="text-caption font-caption text-subtext-color">→</span>
            <ParticipantAvatar participant={to} size="x-small" />
            <span className="text-caption-bold font-caption-bold text-subtext-color">
              {to.name}
            </span>
          </div>
        ) : (
          <span className="text-caption font-caption text-subtext-color">{from.name}</span>
        )}
        <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
          {children}
        </div>
      </div>
    </div>
  );
};
