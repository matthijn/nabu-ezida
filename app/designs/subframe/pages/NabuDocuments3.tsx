"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { IconButton } from "~/ui/components/IconButton";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled";
import { FeatherAlertCircle } from "@subframe/core";
import { FeatherArrowRight } from "@subframe/core";
import { FeatherBarChart3 } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherChevronRight } from "@subframe/core";
import { FeatherCircle } from "@subframe/core";
import { FeatherCloud } from "@subframe/core";
import { FeatherCpu } from "@subframe/core";
import { FeatherExternalLink } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherGlobe } from "@subframe/core";
import { FeatherLightbulb } from "@subframe/core";
import { FeatherLoader2 } from "@subframe/core";
import { FeatherMessageCircle } from "@subframe/core";
import { FeatherMessageSquare } from "@subframe/core";
import { FeatherPause } from "@subframe/core";
import { FeatherRefreshCw } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherSend } from "@subframe/core";
import { FeatherSkipForward } from "@subframe/core";
import { FeatherSparkles } from "@subframe/core";
import { FeatherStopCircle } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import { FeatherZap } from "@subframe/core";

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
      </div>
      <div className="flex w-full items-start gap-4">
        <div className="flex grow shrink-0 basis-0 items-center gap-3 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-2">
          <IconWithBackground
            variant="brand"
            size="small"
            icon={<FeatherSearch />}
          />
          <div className="flex grow shrink-0 basis-0 flex-col items-start">
            <span className="text-caption-bold font-caption-bold text-default-font">
              Exploring your question...
            </span>
            <span className="text-caption font-caption text-subtext-color">
              8 steps so far • Active
            </span>
          </div>
          <FeatherLoader2 className="text-body font-body text-brand-600 @keyframes spin animate-spin" />
          <IconButton
            variant="brand-tertiary"
            size="small"
            icon={<FeatherChevronRight />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
        </div>
        <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-brand-300 bg-default-background shadow-lg">
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-4 py-3">
            <div className="flex items-center gap-2">
              <IconWithBackground
                variant="brand"
                size="small"
                icon={<FeatherSearch />}
              />
              <div className="flex flex-col items-start">
                <span className="text-body-bold font-body-bold text-default-font">
                  Exploration Log
                </span>
                <span className="text-caption font-caption text-subtext-color">
                  Active • Started 4m ago
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
          <div className="flex w-full flex-col items-start gap-2 px-4 py-3 overflow-auto">
            <div className="flex w-full flex-col items-start gap-1 rounded-md bg-neutral-50 px-3 py-2">
              <span className="text-caption-bold font-caption-bold text-subtext-color">
                Your Question
              </span>
              <span className="text-caption font-caption text-default-font">
                What conservation strategies work best in tropical regions?
              </span>
            </div>
            <div className="flex w-full items-center gap-2">
              <div className="flex grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
              <span className="text-caption font-caption text-subtext-color">
                Exploration Steps
              </span>
              <div className="flex grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Going to search for conservation research papers
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherCheck className="text-caption font-caption text-success-600 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Found 47 relevant studies from past 5 years
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Will check regional variations in approach
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Discovered that community-led models show 40% better outcomes
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Checking funding source differences
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Found that government programs have 3x more funding than private
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Going to analyze time horizons for different strategies
              </span>
            </div>
            <div className="flex w-full items-start gap-2">
              <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
              <span className="text-caption font-caption text-default-font">
                Discovered long-term strategies (10+ years) have better results
              </span>
            </div>
            <div className="flex w-full items-start gap-2 rounded-md bg-brand-50 px-2 py-2">
              <FeatherLoader2 className="text-caption font-caption text-brand-600 @keyframes spin animate-spin mt-0.5" />
              <span className="text-caption font-caption text-brand-700">
                Looking into economic sustainability factors...
              </span>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
            <Button
              variant="neutral-secondary"
              size="small"
              icon={<FeatherStopCircle />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              Stop
            </Button>
            <Button
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherMessageCircle />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              Ask about this
            </Button>
          </div>
        </div>
      </div>
      <div className="flex w-full items-start gap-4">
        <div className="flex grow shrink-0 basis-0 items-center gap-3 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-2">
          <IconWithBackground
            variant="brand"
            size="small"
            icon={<FeatherCpu />}
          />
          <div className="flex grow shrink-0 basis-0 flex-col items-start">
            <span className="text-caption-bold font-caption-bold text-default-font">
              Running 4 tools
            </span>
            <span className="text-caption font-caption text-subtext-color">
              2 complete • 1 active • 1 pending
            </span>
          </div>
          <IconButton
            variant="brand-tertiary"
            size="small"
            icon={<FeatherChevronRight />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
        </div>
        <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-brand-300 bg-default-background shadow-lg">
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-4 py-3">
            <div className="flex items-center gap-2">
              <IconWithBackground
                variant="brand"
                size="small"
                icon={<FeatherCpu />}
              />
              <span className="text-body-bold font-body-bold text-default-font">
                Tool Execution
              </span>
            </div>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherX />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-full flex-col items-start gap-3 px-4 py-3 overflow-auto">
            <div className="flex w-full items-start gap-3 rounded-md border border-solid border-success-300 bg-success-50 px-3 py-3">
              <IconWithBackground
                variant="success"
                size="small"
                icon={<FeatherSearch />}
              />
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-body-bold font-body-bold text-default-font">
                  Search database
                </span>
                <span className="text-caption font-caption text-default-font">
                  Searched research database for papers on tropical biodiversity
                  and found 47 relevant publications
                </span>
              </div>
            </div>
            <div className="flex w-full items-start gap-3 rounded-md border border-solid border-success-300 bg-success-50 px-3 py-3">
              <IconWithBackground
                variant="success"
                size="small"
                icon={<FeatherCloud />}
              />
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-body-bold font-body-bold text-default-font">
                  Fetch weather data
                </span>
                <span className="text-caption font-caption text-default-font">
                  Retrieved climate data from weather API including temperature
                  and precipitation for 3 tropical regions
                </span>
              </div>
            </div>
            <div className="flex w-full items-start gap-3 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-3">
              <IconWithBackground
                variant="brand"
                size="small"
                icon={<FeatherBarChart3 />}
              />
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-body-bold font-body-bold text-default-font">
                  Analyze correlation
                </span>
                <span className="text-caption font-caption text-default-font">
                  Running statistical analysis to find correlation between
                  climate changes and species population trends
                </span>
              </div>
            </div>
            <div className="flex w-full items-start gap-3 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-3 py-3">
              <IconWithBackground
                variant="neutral"
                size="small"
                icon={<FeatherFileText />}
              />
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-body-bold font-body-bold text-neutral-600">
                  Generate report
                </span>
                <span className="text-caption font-caption text-neutral-400">
                  Will compile findings into a comprehensive summary document
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full items-start gap-4">
        <div className="flex grow shrink-0 basis-0 items-center gap-3 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-2">
          <IconWithBackground
            variant="brand"
            size="small"
            icon={<FeatherFileText />}
          />
          <div className="flex grow shrink-0 basis-0 flex-col items-start">
            <span className="text-caption-bold font-caption-bold text-default-font">
              Reading file
            </span>
            <span className="text-caption font-caption text-subtext-color">
              Loading document contents...
            </span>
          </div>
          <FeatherLoader2 className="text-body font-body text-brand-600 @keyframes spin animate-spin" />
        </div>
        <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-brand-300 bg-default-background shadow-lg">
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-4 py-3">
            <div className="flex items-center gap-2">
              <IconWithBackground
                variant="brand"
                size="small"
                icon={<FeatherZap />}
              />
              <span className="text-body-bold font-body-bold text-default-font">
                Tool Execution
              </span>
            </div>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherX />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-full flex-col items-start gap-2 px-4 py-3">
            <div className="flex w-full items-start gap-3 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-3">
              <IconWithBackground
                variant="brand"
                size="small"
                icon={<FeatherFileText />}
              />
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-body-bold font-body-bold text-default-font">
                  Reading file
                </span>
                <span className="text-caption font-caption text-default-font">
                  Loading document contents from research_paper.pdf to analyze
                  methodology section
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full items-start gap-4">
        <div className="flex grow shrink-0 basis-0 items-center gap-3 rounded-md border border-solid border-error-300 bg-error-50 px-3 py-2">
          <IconWithBackground
            variant="error"
            size="small"
            icon={<FeatherAlertCircle />}
          />
          <div className="flex grow shrink-0 basis-0 flex-col items-start">
            <span className="text-caption-bold font-caption-bold text-default-font">
              API call failed
            </span>
            <span className="text-caption font-caption text-subtext-color">
              Connection timeout
            </span>
          </div>
          <Button
            variant="neutral-tertiary"
            size="small"
            icon={<FeatherRefreshCw />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          >
            Retry
          </Button>
        </div>
        <div className="flex w-80 flex-none flex-col items-start rounded-lg border border-solid border-error-300 bg-default-background shadow-lg">
          <div className="flex w-full items-center justify-between bg-error-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <IconWithBackground
                variant="error"
                size="small"
                icon={<FeatherAlertCircle />}
              />
              <span className="text-body-bold font-body-bold text-default-font">
                Tool Failed
              </span>
            </div>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherX />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-full flex-col items-start gap-2 px-4 py-3">
            <div className="flex w-full items-start gap-3 rounded-md border border-solid border-error-300 bg-error-50 px-3 py-3">
              <IconWithBackground
                variant="error"
                size="small"
                icon={<FeatherGlobe />}
              />
              <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                <span className="text-body-bold font-body-bold text-default-font">
                  API call failed
                </span>
                <span className="text-caption font-caption text-default-font">
                  Attempted to fetch data from external API but connection timed
                  out after 30 seconds. Please check network connection and try
                  again.
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full items-center gap-2 border-t border-solid border-neutral-border px-4 py-3">
            <Button
              variant="brand-primary"
              size="small"
              icon={<FeatherRefreshCw />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              Retry
            </Button>
            <Button
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherSkipForward />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              Skip
            </Button>
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
                      <FeatherLoader2 className="text-caption font-caption text-brand-600 @keyframes spin animate-spin" />
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
    </div>
  );
}

export default NabuDocuments3;
