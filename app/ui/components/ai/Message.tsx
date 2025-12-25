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

const ParticipantAvatar = ({ participant, size }: ParticipantAvatarProps) => {
  if (participant.type === "llm") {
    return (
      <div
        className="flex flex-none items-center justify-center rounded-full"
        style={{
          backgroundColor: `${participant.color}20`,
          width: size === "x-small" ? 20 : size === "small" ? 24 : 32,
          height: size === "x-small" ? 20 : size === "small" ? 24 : 32,
        }}
      >
        <FeatherSparkles
          style={{ color: participant.color }}
          className={size === "x-small" ? "w-3 h-3" : size === "small" ? "w-3.5 h-3.5" : "w-4 h-4"}
        />
      </div>
    );
  }

  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-['Manrope'] font-semibold"
      style={{
        backgroundColor: participant.image ? undefined : `${participant.color}20`,
        color: participant.color,
        width: size === "x-small" ? 20 : size === "small" ? 24 : 32,
        height: size === "x-small" ? 20 : size === "small" ? 24 : 32,
        fontSize: size === "x-small" ? 10 : size === "small" ? 10 : 14,
      }}
    >
      {participant.image ? (
        <img
          src={participant.image}
          alt={participant.name}
          className="w-full h-full object-cover rounded-full"
        />
      ) : (
        participant.initial
      )}
    </div>
  );
};

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
