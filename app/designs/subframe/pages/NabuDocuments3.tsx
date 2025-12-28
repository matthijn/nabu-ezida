"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { LinkButton } from "~/ui/components/LinkButton";
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled";
import { Tooltip } from "~/ui/components/Tooltip";
import { FeatherAlertCircle } from "@subframe/core";
import { FeatherArchive } from "@subframe/core";
import { FeatherBell } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherChevronRight } from "@subframe/core";
import { FeatherChevronUp } from "@subframe/core";
import { FeatherCircle } from "@subframe/core";
import { FeatherExternalLink } from "@subframe/core";
import { FeatherLoader2 } from "@subframe/core";
import { FeatherMaximize2 } from "@subframe/core";
import { FeatherMessageCircle } from "@subframe/core";
import { FeatherMessageSquare } from "@subframe/core";
import { FeatherMinus } from "@subframe/core";
import { FeatherMoreHorizontal } from "@subframe/core";
import { FeatherPaperclip } from "@subframe/core";
import { FeatherPause } from "@subframe/core";
import { FeatherSend } from "@subframe/core";
import { FeatherSparkles } from "@subframe/core";
import { FeatherUserPlus } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

function NabuDocuments3() {
  return (
    <div className="flex w-full max-w-[768px] flex-col items-start gap-8">
      <div className="flex w-full flex-col items-start gap-6">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Sidebar Popover Hybrid Patterns
        </span>
        <span className="text-body font-body text-subtext-color">
          Inline indicators that expand into full conversation panels
        </span>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Pattern 1: Status Dot with Avatar Stack
        </span>
        <span className="text-caption font-caption text-subtext-color">
          Minimal inline indicator with stacked avatars and status dot
        </span>
        <div className="flex w-full items-start gap-4">
          <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md border border-solid border-neutral-border bg-white px-3 py-2 shadow-sm">
            <div className="flex h-2 w-2 flex-none items-start rounded-full bg-brand-500" />
            <div className="flex items-center">
              <Avatar
                size="x-small"
                image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
              >
                A
              </Avatar>
              <Avatar className="-ml-1" variant="brand" size="x-small" image="">
                N
              </Avatar>
            </div>
            <span className="grow shrink-0 basis-0 text-caption font-caption text-default-font">
              Review discussion
            </span>
            <Badge variant="neutral" icon={null}>
              3
            </Badge>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherChevronRight />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
            <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-brand-500" />
                <span className="text-body-bold font-body-bold text-default-font">
                  Active conversation
                </span>
              </div>
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <div className="flex w-full flex-col items-start gap-3 px-4 py-3">
              <div className="flex w-full items-start gap-2">
                <Avatar
                  size="x-small"
                  image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                >
                  A
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-caption-bold font-caption-bold text-default-font">
                      You
                    </span>
                    <span className="text-caption font-caption text-neutral-400">
                      •
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      2m ago
                    </span>
                  </div>
                  <span className="text-caption font-caption text-default-font">
                    Can you review the citations?
                  </span>
                </div>
              </div>
              <div className="flex w-full items-start gap-2">
                <IconWithBackground
                  variant="brand"
                  size="x-small"
                  icon={<FeatherSparkles />}
                />
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-caption-bold font-caption-bold text-default-font">
                      Nabu
                    </span>
                    <span className="text-caption font-caption text-neutral-400">
                      •
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      Just now
                    </span>
                  </div>
                  <span className="text-caption font-caption text-default-font">
                    Which section needs review?
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
              <TextFieldUnstyled>
                <TextFieldUnstyled.Input
                  placeholder="Reply..."
                  value=""
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
                />
              </TextFieldUnstyled>
              <IconButton
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          State 1: Typing
        </span>
        <div className="flex w-full items-center gap-2 rounded-full border border-solid border-brand-300 bg-brand-50 px-3 py-2">
          <IconWithBackground
            variant="brand"
            size="x-small"
            icon={<FeatherSparkles />}
          />
          <span className="text-caption-bold font-caption-bold text-brand-700">
            @nabu
          </span>
          <TextFieldUnstyled className="h-auto grow shrink-0 basis-0">
            <TextFieldUnstyled.Input
              placeholder="Ask a question..."
              value=""
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
            />
          </TextFieldUnstyled>
          <IconButton
            variant="brand-primary"
            size="small"
            icon={<FeatherSend />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
          <IconButton
            variant="neutral-tertiary"
            size="small"
            icon={<FeatherX />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Pattern 2: Compact Pill with Participant Count
        </span>
        <span className="text-caption font-caption text-subtext-color">
          Rounded pill design with message count and multiple participant
          indicator
        </span>
        <div className="flex w-full items-start gap-4">
          <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-full border border-solid border-warning-300 bg-warning-50 px-3 py-1.5">
            <div className="flex items-center">
              <Avatar variant="warning" size="x-small" image="">
                J
              </Avatar>
              <Avatar
                className="-ml-1"
                size="x-small"
                image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
              >
                A
              </Avatar>
            </div>
            <span className="text-caption font-caption text-default-font">
              Table feedback
            </span>
            <div className="flex grow shrink-0 basis-0 items-start" />
            <Badge variant="warning" icon={null}>
              5 msgs
            </Badge>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherMaximize2 />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-warning-300 bg-default-background shadow-lg">
            <div className="flex w-full items-center justify-between bg-warning-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Avatar variant="warning" size="x-small" image="">
                    J
                  </Avatar>
                  <Avatar
                    className="-ml-1"
                    size="x-small"
                    image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                  >
                    A
                  </Avatar>
                </div>
                <span className="text-body-bold font-body-bold text-default-font">
                  2 participants
                </span>
              </div>
              <div className="flex items-center gap-1">
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherMinus />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherX />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-2 px-4 py-3">
              <div className="flex w-full items-center gap-2">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Earlier messages
                </span>
                <div className="flex grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
                <LinkButton
                  variant="neutral"
                  size="small"
                  icon={<FeatherChevronUp />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                >
                  Show 3 more
                </LinkButton>
              </div>
              <div className="flex w-full items-start gap-2">
                <Avatar variant="warning" size="x-small" image="">
                  J
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start">
                  <span className="text-caption font-caption text-default-font">
                    The comparison table looks great!
                  </span>
                  <span className="text-caption font-caption text-neutral-400">
                    3m ago
                  </span>
                </div>
              </div>
              <div className="flex w-full items-start gap-2">
                <Avatar
                  size="x-small"
                  image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                >
                  A
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start">
                  <span className="text-caption font-caption text-default-font">
                    Thanks! Should I add more criteria?
                  </span>
                  <span className="text-caption font-caption text-neutral-400">
                    Just now
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
              <TextFieldUnstyled>
                <TextFieldUnstyled.Input
                  placeholder="Type a message..."
                  value=""
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
                />
              </TextFieldUnstyled>
              <IconButton
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Pattern 3: Icon-Based Inline Trigger
        </span>
        <span className="text-caption font-caption text-subtext-color">
          Minimal icon button with badge counter that expands to full thread
        </span>
        <div className="flex w-full items-start gap-4">
          <div className="flex grow shrink-0 basis-0 items-center gap-3 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-2">
            <IconWithBackground
              variant="brand"
              size="small"
              icon={<FeatherMessageSquare />}
            />
            <span className="grow shrink-0 basis-0 text-caption font-caption text-default-font">
              Nabu is working on your request
            </span>
            <Badge variant="brand" icon={<FeatherMessageCircle />}>
              2 new
            </Badge>
            <IconButton
              variant="brand-tertiary"
              size="small"
              icon={<FeatherExternalLink />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-brand-300 bg-default-background shadow-lg">
            <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-4 py-3">
              <div className="flex items-center gap-2">
                <IconWithBackground
                  variant="brand"
                  size="small"
                  icon={<FeatherSparkles />}
                />
                <div className="flex flex-col items-start">
                  <span className="text-body-bold font-body-bold text-default-font">
                    AI Task Thread
                  </span>
                  <span className="text-caption font-caption text-subtext-color">
                    Active • Started 5m ago
                  </span>
                </div>
              </div>
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <div className="flex w-full flex-col items-start gap-3 px-4 py-3 overflow-auto">
              <div className="flex w-full items-start gap-2">
                <Avatar
                  size="x-small"
                  image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                >
                  A
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <span className="text-caption-bold font-caption-bold text-default-font">
                    You
                  </span>
                  <span className="text-caption font-caption text-default-font">
                    Analyze the biodiversity data
                  </span>
                </div>
              </div>
              <div className="flex w-full items-start gap-2">
                <IconWithBackground
                  variant="brand"
                  size="x-small"
                  icon={<FeatherSparkles />}
                />
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
                  <span className="text-caption-bold font-caption-bold text-default-font">
                    Nabu
                  </span>
                  <div className="flex w-full flex-col items-start gap-1 rounded-md bg-brand-50 px-2 py-2">
                    <div className="flex w-full items-center gap-2">
                      <FeatherCheck className="text-caption font-caption text-success-600" />
                      <span className="text-caption font-caption text-default-font">
                        Data collected
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <FeatherLoader2 className="text-caption font-caption text-brand-600 animate-spin" />
                      <span className="text-caption font-caption text-default-font">
                        Analyzing trends
                      </span>
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <FeatherCircle className="text-caption font-caption text-neutral-400" />
                      <span className="text-caption font-caption text-neutral-400">
                        Writing summary
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-between border-t border-solid border-neutral-border px-4 py-3">
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherPause />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Pause
              </Button>
              <Button
                variant="neutral-secondary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Pattern 4: Status Bar with Quick Actions
        </span>
        <span className="text-caption font-caption text-subtext-color">
          Horizontal bar showing conversation status with inline quick actions
        </span>
        <div className="flex w-full items-start gap-4">
          <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md border border-solid border-neutral-border bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <div className="flex h-2 w-2 flex-none items-start rounded-full bg-success-500" />
              <Avatar variant="success" size="x-small" image="">
                E
              </Avatar>
            </div>
            <div className="flex grow shrink-0 basis-0 flex-col items-start">
              <span className="text-caption-bold font-caption-bold text-default-font">
                Emily completed review
              </span>
              <span className="text-caption font-caption text-subtext-color">
                3 comments • 10m ago
              </span>
            </div>
            <Button
              variant="neutral-tertiary"
              size="small"
              icon={null}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              View
            </Button>
          </div>
          <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-success-300 bg-default-background shadow-lg">
            <div className="flex w-full items-center justify-between bg-success-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-success-500" />
                <span className="text-body-bold font-body-bold text-default-font">
                  Review completed
                </span>
              </div>
              <div className="flex items-center gap-1">
                <SubframeCore.Tooltip.Provider>
                  <SubframeCore.Tooltip.Root>
                    <SubframeCore.Tooltip.Trigger asChild={true}>
                      <IconButton
                        variant="neutral-tertiary"
                        size="small"
                        icon={<FeatherCheck />}
                        onClick={(
                          event: React.MouseEvent<HTMLButtonElement>
                        ) => {}}
                      />
                    </SubframeCore.Tooltip.Trigger>
                    <SubframeCore.Tooltip.Portal>
                      <SubframeCore.Tooltip.Content
                        side="top"
                        align="center"
                        sideOffset={4}
                        asChild={true}
                      >
                        <Tooltip>Mark as resolved</Tooltip>
                      </SubframeCore.Tooltip.Content>
                    </SubframeCore.Tooltip.Portal>
                  </SubframeCore.Tooltip.Root>
                </SubframeCore.Tooltip.Provider>
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherX />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3 px-4 py-3">
              <div className="flex w-full items-start gap-2">
                <Avatar variant="success" size="x-small" image="">
                  E
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <div className="flex items-center gap-1">
                    <span className="text-caption-bold font-caption-bold text-default-font">
                      Emily Chen
                    </span>
                    <span className="text-caption font-caption text-neutral-400">
                      •
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      10m ago
                    </span>
                  </div>
                  <span className="text-caption font-caption text-default-font">
                    Reviewed the methodology section. Overall looks solid!
                  </span>
                </div>
              </div>
              <div className="flex w-full items-start gap-2 pl-6">
                <FeatherCheck className="text-caption font-caption text-success-600" />
                <span className="text-caption font-caption text-default-font">
                  Citations are properly formatted
                </span>
              </div>
              <div className="flex w-full items-start gap-2 pl-6">
                <FeatherCheck className="text-caption font-caption text-success-600" />
                <span className="text-caption font-caption text-default-font">
                  Data sources are credible
                </span>
              </div>
              <div className="flex w-full items-start gap-2 pl-6">
                <FeatherAlertCircle className="text-caption font-caption text-warning-600" />
                <span className="text-caption font-caption text-default-font">
                  Minor: Consider adding more recent studies
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <Avatar variant="success" size="x-small" image="">
                  E
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <span className="text-caption font-caption text-default-font">
                    Let me know if you need any clarification!
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
              <Button
                variant="brand-primary"
                size="small"
                icon={<FeatherCheck />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Resolve
              </Button>
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherMessageCircle />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Reply
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Pattern 5: Collapsed Thread Summary
        </span>
        <span className="text-caption font-caption text-subtext-color">
          Dense summary view with participant stack and last message preview
        </span>
        <div className="flex w-full items-start gap-4">
          <div className="flex grow shrink-0 basis-0 items-center gap-2 rounded-md border border-solid border-neutral-border bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center">
              <Avatar
                size="x-small"
                image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
              >
                A
              </Avatar>
              <Avatar
                className="-ml-1"
                variant="warning"
                size="x-small"
                image=""
              >
                J
              </Avatar>
              <Avatar className="-ml-1" variant="brand" size="x-small" image="">
                N
              </Avatar>
              <div className="flex h-5 w-5 flex-none items-center justify-center rounded-full bg-neutral-200 -ml-1">
                <span className="text-caption font-caption text-neutral-600">
                  +2
                </span>
              </div>
            </div>
            <div className="flex grow shrink-0 basis-0 flex-col items-start">
              <span className="text-caption-bold font-caption-bold text-default-font">
                Research discussion
              </span>
              <span className="line-clamp-1 w-full text-caption font-caption text-subtext-color">
                Jane: That makes sense, let&#39;s proceed...
              </span>
            </div>
            <span className="text-caption font-caption text-subtext-color">
              2h
            </span>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherChevronRight />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
            <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <Avatar
                    size="x-small"
                    image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                  >
                    A
                  </Avatar>
                  <Avatar
                    className="-ml-1"
                    variant="warning"
                    size="x-small"
                    image=""
                  >
                    J
                  </Avatar>
                  <Avatar
                    className="-ml-1"
                    variant="brand"
                    size="x-small"
                    image=""
                  >
                    N
                  </Avatar>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-body-bold font-body-bold text-default-font">
                    Research discussion
                  </span>
                  <span className="text-caption font-caption text-subtext-color">
                    5 participants • 12 messages
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <SubframeCore.DropdownMenu.Root>
                  <SubframeCore.DropdownMenu.Trigger asChild={true}>
                    <IconButton
                      variant="neutral-tertiary"
                      size="small"
                      icon={<FeatherMoreHorizontal />}
                      onClick={(
                        event: React.MouseEvent<HTMLButtonElement>
                      ) => {}}
                    />
                  </SubframeCore.DropdownMenu.Trigger>
                  <SubframeCore.DropdownMenu.Portal>
                    <SubframeCore.DropdownMenu.Content
                      side="bottom"
                      align="end"
                      sideOffset={4}
                      asChild={true}
                    >
                      <DropdownMenu>
                        <DropdownMenu.DropdownItem icon={<FeatherUserPlus />}>
                          Add participant
                        </DropdownMenu.DropdownItem>
                        <DropdownMenu.DropdownItem icon={<FeatherBell />}>
                          Mute thread
                        </DropdownMenu.DropdownItem>
                        <DropdownMenu.DropdownItem icon={<FeatherArchive />}>
                          Archive
                        </DropdownMenu.DropdownItem>
                      </DropdownMenu>
                    </SubframeCore.DropdownMenu.Content>
                  </SubframeCore.DropdownMenu.Portal>
                </SubframeCore.DropdownMenu.Root>
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherX />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
              </div>
            </div>
            <div className="flex w-full flex-col items-start px-4 py-3 overflow-auto">
              <div className="flex w-full flex-col items-start gap-3">
                <div className="flex w-full items-center gap-2">
                  <div className="flex grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
                  <span className="text-caption font-caption text-subtext-color">
                    Today
                  </span>
                  <div className="flex grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
                </div>
                <div className="flex w-full items-start gap-2">
                  <Avatar
                    size="x-small"
                    image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                  >
                    A
                  </Avatar>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-caption-bold font-caption-bold text-default-font">
                        You
                      </span>
                      <span className="text-caption font-caption text-subtext-color">
                        9:42 AM
                      </span>
                    </div>
                    <span className="text-caption font-caption text-default-font">
                      Should we include climate data?
                    </span>
                  </div>
                </div>
                <div className="flex w-full items-start gap-2">
                  <Avatar variant="warning" size="x-small" image="">
                    J
                  </Avatar>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-caption-bold font-caption-bold text-default-font">
                        Jane
                      </span>
                      <span className="text-caption font-caption text-subtext-color">
                        9:45 AM
                      </span>
                    </div>
                    <span className="text-caption font-caption text-default-font">
                      Yes, that would add valuable context
                    </span>
                  </div>
                </div>
                <div className="flex w-full items-start gap-2">
                  <IconWithBackground
                    variant="brand"
                    size="x-small"
                    icon={<FeatherSparkles />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-caption-bold font-caption-bold text-default-font">
                        Nabu
                      </span>
                      <span className="text-caption font-caption text-subtext-color">
                        9:46 AM
                      </span>
                    </div>
                    <span className="text-caption font-caption text-default-font">
                      I can pull climate data from the past 20 years. Should I
                      proceed?
                    </span>
                  </div>
                </div>
                <div className="flex w-full items-start gap-2">
                  <Avatar
                    size="x-small"
                    image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
                  >
                    A
                  </Avatar>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-0.5">
                    <div className="flex items-center gap-1">
                      <span className="text-caption-bold font-caption-bold text-default-font">
                        You
                      </span>
                      <span className="text-caption font-caption text-subtext-color">
                        9:48 AM
                      </span>
                    </div>
                    <span className="text-caption font-caption text-default-font">
                      Yes please!
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
              <Avatar
                size="x-small"
                image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
              >
                A
              </Avatar>
              <TextFieldUnstyled>
                <TextFieldUnstyled.Input
                  placeholder="Reply to thread..."
                  value=""
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
                />
              </TextFieldUnstyled>
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherPaperclip />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
              <IconButton
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Pattern 6: Notification Style with Action Buttons
        </span>
        <span className="text-caption font-caption text-subtext-color">
          Alert-style indicator with inline accept/reject actions
        </span>
        <div className="flex w-full items-start gap-4">
          <div className="flex grow shrink-0 basis-0 items-start gap-3 rounded-md border border-solid border-error-300 bg-error-50 px-3 py-2">
            <div className="flex h-2 w-2 flex-none items-start rounded-full bg-error-500 mt-1.5" />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
              <div className="flex w-full flex-col items-start">
                <span className="text-caption-bold font-caption-bold text-default-font">
                  Sarah Chen requested changes
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  3 items need attention • 5m ago
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="neutral-primary"
                  size="small"
                  icon={null}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                >
                  Review
                </Button>
                <Button
                  variant="neutral-tertiary"
                  size="small"
                  icon={null}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
          <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-error-300 bg-default-background shadow-lg">
            <div className="flex w-full items-center justify-between bg-error-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-2 w-2 flex-none items-start rounded-full bg-error-500" />
                <Avatar variant="error" size="small" image="">
                  S
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-body-bold font-body-bold text-default-font">
                    Changes requested
                  </span>
                  <span className="text-caption font-caption text-subtext-color">
                    Sarah Chen • 5m ago
                  </span>
                </div>
              </div>
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <div className="flex w-full flex-col items-start gap-3 px-4 py-3">
              <div className="flex w-full items-start gap-2">
                <Avatar variant="error" size="x-small" image="">
                  S
                </Avatar>
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
                  <span className="text-caption font-caption text-default-font">
                    I reviewed the document and have a few concerns:
                  </span>
                  <div className="flex w-full flex-col items-start gap-2 rounded-md bg-error-50 px-3 py-2">
                    <div className="flex w-full items-start gap-2">
                      <FeatherAlertCircle className="text-caption font-caption text-error-600 mt-0.5" />
                      <div className="flex grow shrink-0 basis-0 flex-col items-start">
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          Missing citations
                        </span>
                        <span className="text-caption font-caption text-subtext-color">
                          Section 3 needs proper references
                        </span>
                      </div>
                    </div>
                    <div className="flex w-full items-start gap-2">
                      <FeatherAlertCircle className="text-caption font-caption text-error-600 mt-0.5" />
                      <div className="flex grow shrink-0 basis-0 flex-col items-start">
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          Data inconsistency
                        </span>
                        <span className="text-caption font-caption text-subtext-color">
                          Table 2 numbers don&#39;t match text
                        </span>
                      </div>
                    </div>
                    <div className="flex w-full items-start gap-2">
                      <FeatherAlertCircle className="text-caption font-caption text-error-600 mt-0.5" />
                      <div className="flex grow shrink-0 basis-0 flex-col items-start">
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          Methodology unclear
                        </span>
                        <span className="text-caption font-caption text-subtext-color">
                          Need more detail on sampling approach
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-default-font">
                    Please address these before we can proceed.
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
              <Button
                variant="brand-primary"
                size="small"
                icon={<FeatherCheck />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Accept changes
              </Button>
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherMessageCircle />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Reply
              </Button>
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherExternalLink />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                View doc
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NabuDocuments3;
