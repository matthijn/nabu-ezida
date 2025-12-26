"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled";
import { FeatherCheck } from "@subframe/core";
import { FeatherChevronDown } from "@subframe/core";
import { FeatherCircle } from "@subframe/core";
import { FeatherFile } from "@subframe/core";
import { FeatherLoader2 } from "@subframe/core";
import { FeatherMessageCircle } from "@subframe/core";
import { FeatherSend } from "@subframe/core";
import { FeatherSparkles } from "@subframe/core";
import { FeatherX } from "@subframe/core";

function NabuDocuments2() {
  return (
    <div className="group/536ce3be flex w-full max-w-[768px] cursor-pointer flex-col items-start gap-8">
      <div className="flex w-full flex-col items-start gap-6">
        <span className="text-heading-2 font-heading-2 text-default-font">
          @Mention Examples
        </span>
        <div className="flex w-full flex-col items-start gap-4">
          <span className="text-body-bold font-body-bold text-default-font">
            Inline Editor with @Mention
          </span>
          <div className="flex w-full flex-col items-start gap-2 rounded-lg border border-solid border-neutral-border bg-white px-4 py-3">
            <div className="flex w-full items-start gap-2">
              <span className="text-body font-body text-default-font">Hey</span>
              <span className="text-body-bold font-body-bold text-warning-600">
                @part
              </span>
              <div className="flex h-5 w-0.5 flex-none items-start bg-brand-600 animate-pulse" />
            </div>
            <div className="flex w-full max-w-[288px] flex-col items-start rounded-lg border border-solid border-neutral-border bg-white shadow-lg relative ml-12">
              <div className="flex w-full flex-col items-start">
                <div className="flex w-full items-center gap-3 px-3 py-2 cursor-pointer group-hover/536ce3be:bg-neutral-50">
                  <Avatar variant="success" size="small" image="">
                    M
                  </Avatar>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Marcus
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      Data analyst
                    </span>
                  </div>
                </div>
                <div className="flex w-full items-center gap-3 px-3 py-2 cursor-pointer group-hover/536ce3be:bg-neutral-50">
                  <Avatar variant="warning" size="small" image="">
                    P
                  </Avatar>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Parker
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      Content strategist
                    </span>
                  </div>
                </div>
                <div className="flex w-full items-center gap-3 bg-error-50 px-3 py-2 cursor-pointer">
                  <Avatar variant="error" size="small" image="">
                    P
                  </Avatar>
                  <div className="flex grow shrink-0 basis-0 flex-col items-start">
                    <span className="text-body-bold font-body-bold text-default-font">
                      Patricia
                    </span>
                    <span className="text-caption font-caption text-subtext-color">
                      Project manager
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 1: Initial Follow-up Question
        </span>
        <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 bg-brand-50 px-4 py-4">
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="text-caption font-caption text-subtext-color">
                  You
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  →
                </span>
                <IconWithBackground
                  variant="brand"
                  size="x-small"
                  icon={<FeatherSparkles />}
                />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Nabu
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Can you help me write a conclusion for this section?
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                Nabu
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  I&#39;d be happy to help! To write an effective conclusion, I
                  need to know a bit more:
                </span>
                <div className="flex w-full flex-col items-start gap-2 pl-3">
                  <div className="flex w-full items-start gap-2">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      What are the main points you covered in this section?
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-2">
                    <span className="text-body font-body text-default-font">
                      •
                    </span>
                    <span className="text-body font-body text-default-font">
                      What tone are you aiming for (formal, conversational,
                      persuasive)?
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 pt-2">
            <TextFieldUnstyled className="h-auto w-full flex-none">
              <TextFieldUnstyled.Input
                placeholder="Type your response..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextFieldUnstyled>
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Cancel
              </Button>
              <Button
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 2: Multi-turn Conversation
        </span>
        <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-warning-400 bg-warning-50 px-4 py-4">
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="text-caption font-caption text-subtext-color">
                  You
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  →
                </span>
                <Avatar variant="warning" size="x-small" image="">
                  J
                </Avatar>
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Jane
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Add a table comparing the conservation strategies
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <Avatar variant="warning" size="small" image="">
              J
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                Jane
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Which conservation strategies would you like me to compare?
                  For example:
                </span>
                <div className="flex w-full flex-wrap items-start gap-2">
                  <Badge variant="neutral" icon={null}>
                    Protected areas
                  </Badge>
                  <Badge variant="neutral" icon={null}>
                    Community-led
                  </Badge>
                  <Badge variant="neutral" icon={null}>
                    Economic incentives
                  </Badge>
                  <Badge variant="neutral" icon={null}>
                    Regulatory
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                You
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Compare community-led, economic incentives, and regulatory
                  approaches
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <Avatar variant="warning" size="small" image="">
              J
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                Jane
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Perfect! What criteria should I use for comparison? (e.g.,
                  cost, effectiveness, timeframe, scalability)
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 pt-2">
            <TextFieldUnstyled className="h-auto w-full flex-none">
              <TextFieldUnstyled.Input
                placeholder="Type your response..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextFieldUnstyled>
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Cancel
              </Button>
              <Button
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 3: Extended Conversation with Context
        </span>
        <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 bg-brand-50 px-4 py-4">
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="text-caption font-caption text-subtext-color">
                  You
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  →
                </span>
                <IconWithBackground
                  variant="brand"
                  size="x-small"
                  icon={<FeatherSparkles />}
                />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Nabu
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Summarize the key findings from my research papers
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                AI Assistant
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  I can help with that! I see you have several documents in your
                  project. Which papers would you like me to focus on?
                </span>
                <div className="flex w-full flex-col items-start gap-2 rounded-md bg-neutral-50 px-3 py-2">
                  <div className="flex w-full items-center gap-2">
                    <FeatherFile className="text-caption font-caption text-brand-600" />
                    <span className="text-caption font-caption text-default-font">
                      Amazon Rainforest Case Study
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <FeatherFile className="text-caption font-caption text-brand-600" />
                    <span className="text-caption font-caption text-default-font">
                      Species Survey Data
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <FeatherFile className="text-caption font-caption text-brand-600" />
                    <span className="text-caption font-caption text-default-font">
                      Literature Review Notes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                You
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  All three, please
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                AI Assistant
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Great! A few quick questions to tailor the summary:
                </span>
                <div className="flex w-full flex-col items-start gap-2 pl-3">
                  <div className="flex w-full items-start gap-2">
                    <span className="text-body font-body text-default-font">
                      1.
                    </span>
                    <span className="text-body font-body text-default-font">
                      How detailed should the summary be? (Brief overview or
                      in-depth analysis)
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-2">
                    <span className="text-body font-body text-default-font">
                      2.
                    </span>
                    <span className="text-body font-body text-default-font">
                      Should I organize by theme or by document?
                    </span>
                  </div>
                  <div className="flex w-full items-start gap-2">
                    <span className="text-body font-body text-default-font">
                      3.
                    </span>
                    <span className="text-body font-body text-default-font">
                      Any specific aspects you want highlighted? (methodology,
                      results, implications)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 pt-2">
            <TextFieldUnstyled className="h-auto w-full flex-none">
              <TextFieldUnstyled.Input
                placeholder="Type your response..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextFieldUnstyled>
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Cancel
              </Button>
              <Button
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 4: Quick Back-and-Forth
        </span>
        <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 bg-brand-50 px-4 py-4">
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="text-caption font-caption text-subtext-color">
                  You
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  →
                </span>
                <IconWithBackground
                  variant="brand"
                  size="x-small"
                  icon={<FeatherSparkles />}
                />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Nabu
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Make this paragraph more concise
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                AI Assistant
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Which paragraph would you like me to work on?
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                You
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  The one about funding mechanisms
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                AI Assistant
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Got it! How much shorter - cut by half or just trim
                  unnecessary words?
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-2 pt-2">
            <TextFieldUnstyled className="h-auto w-full flex-none">
              <TextFieldUnstyled.Input
                placeholder="Type your response..."
                value=""
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
              />
            </TextFieldUnstyled>
            <div className="flex w-full items-center justify-end gap-2">
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherX />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Cancel
              </Button>
              <Button
                variant="brand-primary"
                size="small"
                icon={<FeatherSend />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 5: Task Execution with Subtasks
        </span>
        <div className="flex w-full flex-col items-start gap-3 rounded-lg border-2 border-solid border-brand-400 bg-brand-50 px-4 py-4">
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <div className="flex items-center gap-2">
                <span className="text-caption font-caption text-subtext-color">
                  You
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  →
                </span>
                <IconWithBackground
                  variant="brand"
                  size="x-small"
                  icon={<FeatherSparkles />}
                />
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Nabu
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Create a comprehensive analysis of biodiversity trends
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                AI Assistant
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Which regions should I analyze?
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <Avatar
              size="small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                You
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Southeast Asia and Amazon Basin
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-start gap-3">
            <IconWithBackground
              variant="brand"
              size="medium"
              icon={<FeatherSparkles />}
            />
            <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
              <span className="text-caption font-caption text-subtext-color">
                AI Assistant
              </span>
              <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-default-background px-3 py-2">
                <span className="text-body font-body text-default-font">
                  Perfect! Starting the analysis now.
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start gap-3 rounded-lg bg-default-background px-4 py-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <FeatherLoader2 className="text-body font-body text-brand-600 animate-spin" />
                <span className="text-body-bold font-body-bold text-default-font">
                  Creating comprehensive analysis
                </span>
              </div>
              <Button
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherChevronDown />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <div className="flex w-full flex-col items-start gap-3 pl-6">
              <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full items-center gap-2">
                  <FeatherCheck className="text-body font-body text-success-600" />
                  <span className="text-body font-body text-default-font">
                    Gathering regional data
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-1 pl-6">
                  <div className="flex w-full items-center gap-2">
                    <FeatherCheck className="text-caption font-caption text-success-600" />
                    <span className="text-caption font-caption text-subtext-color">
                      Southeast Asia datasets collected
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <FeatherCheck className="text-caption font-caption text-success-600" />
                    <span className="text-caption font-caption text-subtext-color">
                      Amazon Basin datasets collected
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full items-center gap-2">
                  <FeatherLoader2 className="text-body font-body text-brand-600 animate-spin" />
                  <span className="text-body font-body text-default-font">
                    Analyzing species trends
                  </span>
                </div>
                <div className="flex w-full flex-col items-start gap-1 pl-6">
                  <div className="flex w-full items-center gap-2">
                    <FeatherCheck className="text-caption font-caption text-success-600" />
                    <span className="text-caption font-caption text-subtext-color">
                      Mammal populations assessed
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <FeatherLoader2 className="text-caption font-caption text-brand-600 animate-spin" />
                    <span className="text-caption font-caption text-subtext-color">
                      Bird species analysis in progress
                    </span>
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <FeatherCircle className="text-caption font-caption text-neutral-400" />
                    <span className="text-caption font-caption text-neutral-400">
                      Reptile and amphibian data pending
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full items-center gap-2">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-neutral-400">
                  Cross-referencing conservation efforts
                </span>
              </div>
              <div className="flex w-full items-center gap-2">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-neutral-400">
                  Generating visualizations
                </span>
              </div>
              <div className="flex w-full items-center gap-2">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-neutral-400">
                  Writing summary and recommendations
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center justify-end gap-2">
            <Button
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherMessageCircle />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              Follow up
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
  );
}

export default NabuDocuments2;
