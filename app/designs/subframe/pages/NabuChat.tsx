"use client";

import React from "react";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { IconButton } from "~/ui/components/IconButton";
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout";
import { FeatherArrowRight, FeatherArrowUp, FeatherBookmark, FeatherBookmarkCheck, FeatherCheck, FeatherChevronRight, FeatherCircle, FeatherLightbulb, FeatherLoader2, FeatherMinus, FeatherPlus } from "@subframe/core";

function NabuChat() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full items-center justify-center bg-neutral-100 px-8 py-8">
        <div className="flex h-144 max-w-[448px] grow shrink-0 basis-0 flex-col items-start overflow-hidden rounded-xl border border-solid border-neutral-border bg-white shadow-lg">
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border bg-white px-4 py-3">
            <span className="text-body-bold font-body-bold text-default-font">
              Chat
            </span>
            <IconButton
              variant="neutral-tertiary"
              size="small"
              icon={<FeatherMinus />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            />
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-2 px-4 py-4 overflow-auto">
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-600 px-4 py-2 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-white">
                  Can you help me build a conservation plan for the rainforest
                  region?
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  I&#39;ll research the latest conservation strategies and
                  create a plan for you.
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 bg-neutral-50 pl-3 pr-2 py-2 my-1">
              <span className="text-caption-bold font-caption-bold text-default-font">
                Exploring conservation strategies
              </span>
              <div className="flex w-full items-start gap-2">
                <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Searching for recent conservation research
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Found 23 papers on tropical rainforest conservation
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Analyzing effectiveness metrics
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Community-led programs show 65% better outcomes
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherLoader2 className="text-caption font-caption text-brand-600 @keyframes spin animate-spin mt-0.5" />
                <span className="text-caption font-caption text-brand-700">
                  Checking regional case studies...
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  Should I focus on any specific aspect like funding or
                  community engagement?
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1.5">
              <div className="flex w-full items-center gap-2 rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Community engagement strategies
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full items-center gap-2 rounded-lg border-2 border-solid border-brand-600 bg-brand-50 px-3 py-2">
                  <FeatherCheck className="text-body font-body text-brand-600" />
                  <span className="text-body-bold font-body-bold text-brand-700 grow">
                    Sustainable funding mechanisms
                  </span>
                </div>
                <div className="flex w-full items-center justify-end gap-2 px-2">
                  <Button
                    variant="neutral-tertiary"
                    size="small"
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Continue
                  </Button>
                  <Button
                    variant="brand-primary"
                    size="small"
                    icon={<FeatherBookmark />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Save for future
                  </Button>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Biodiversity monitoring
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start gap-2 max-w-[80%]">
                <div className="flex w-full flex-col items-start gap-1.5">
                  <div className="flex w-full items-center justify-between rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                    <FeatherChevronRight className="text-body font-body text-neutral-400" />
                    <span className="text-body font-body text-default-font grow">
                      Community engagement strategies
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-lg border-2 border-solid border-brand-600 bg-brand-50 px-3 py-2">
                    <FeatherCheck className="text-body font-body text-brand-600" />
                    <span className="text-body-bold font-body-bold text-brand-700 grow">
                      Sustainable funding mechanisms
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                    <FeatherChevronRight className="text-body font-body text-neutral-400" />
                    <span className="text-body font-body text-default-font grow">
                      Biodiversity monitoring
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                    <FeatherChevronRight className="text-body font-body text-neutral-400" />
                    <span className="text-body font-body text-default-font grow">
                      All of the above
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1.5">
              <div className="flex w-full items-center gap-2 rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Community engagement strategies
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border-2 border-solid border-brand-600 bg-brand-50 px-3 py-2">
                <FeatherCheck className="text-body font-body text-brand-600" />
                <span className="text-body-bold font-body-bold text-brand-700 grow">
                  Sustainable funding mechanisms
                </span>
                <Badge variant="success" icon={<FeatherBookmarkCheck />}>
                  Saved
                </Badge>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Biodiversity monitoring
                </span>
              </div>
            </div>
            <div className="flex h-2 w-full flex-none items-start" />
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-600 px-4 py-2 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-white">
                  Focus on community engagement and sustainable funding
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-2 border-l-2 border-solid border-neutral-200 pl-3 pr-2 py-2 my-1">
              <span className="text-caption-bold font-caption-bold text-default-font">
                Plan: Rainforest Conservation Strategy
              </span>
              <div className="flex w-full items-start gap-2">
                <FeatherCheck className="text-caption font-caption text-success-600 mt-0.5" />
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                  <span className="text-caption font-caption text-default-font">
                    Research community engagement models
                  </span>
                  <span className="text-caption font-caption text-subtext-color">
                    Analyzed 15 successful community-led programs in Amazon and
                    Congo regions
                  </span>
                </div>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherCircle className="text-caption font-caption text-brand-600 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Develop stakeholder engagement framework
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 pl-3 py-1 ml-2">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  Stakeholder Mapping
                </span>
                <div className="flex w-full items-start gap-2">
                  <FeatherCheck className="text-caption font-caption text-success-600 mt-0.5" />
                  <span className="text-caption font-caption text-default-font">
                    Identify key community groups
                  </span>
                </div>
                <div className="flex w-full items-start gap-2">
                  <FeatherCircle className="text-caption font-caption text-brand-600 mt-0.5" />
                  <span className="text-caption font-caption text-default-font">
                    Map existing partnerships
                  </span>
                </div>
                <div className="flex w-full items-start mt-1">
                  <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-3 py-1.5 max-w-[90%]">
                    <span className="text-caption font-caption text-default-font">
                      How many stakeholder groups should we prioritize?
                    </span>
                  </div>
                </div>
                <div className="flex h-1 w-full flex-none items-start" />
                <div className="flex w-full items-end justify-end">
                  <div className="flex flex-col items-start rounded-2xl bg-brand-600 px-3 py-1.5 shadow-sm max-w-[90%]">
                    <span className="text-caption font-caption text-white">
                      Start with 3-5 primary groups
                    </span>
                  </div>
                </div>
                <div className="flex w-full items-start gap-2">
                  <FeatherCircle className="text-caption font-caption text-neutral-400 mt-0.5" />
                  <span className="text-caption font-caption text-neutral-400">
                    Create engagement timeline
                  </span>
                </div>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherCircle className="text-caption font-caption text-neutral-400 mt-0.5" />
                <span className="text-caption font-caption text-neutral-400">
                  Establish funding mechanisms
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherCircle className="text-caption font-caption text-neutral-400 mt-0.5" />
                <span className="text-caption font-caption text-neutral-400">
                  Define success metrics
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  I&#39;m working on the stakeholder framework. The plan will be
                  ready in a few minutes.
                </span>
              </div>
            </div>
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-600 px-4 py-2 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-white">
                  Great, also add some examples of successful programs
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1 border-l-2 border-solid border-neutral-200 bg-neutral-50 pl-3 pr-2 py-2 my-1">
              <span className="text-caption-bold font-caption-bold text-default-font">
                Finding case studies
              </span>
              <div className="flex w-full items-start gap-2">
                <FeatherArrowRight className="text-caption font-caption text-neutral-400 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Searching conservation databases
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Found Costa Rica reforestation program with 80% success rate
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <FeatherLightbulb className="text-caption font-caption text-brand-600 mt-0.5" />
                <span className="text-caption font-caption text-default-font">
                  Indigenous land management in Brazil showing 65% lower
                  degradation
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-2xl bg-neutral-100 px-4 py-2 max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  Perfect! I&#39;ve added those examples to the plan. Would you
                  like to review it now?
                </span>
              </div>
            </div>
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-2xl bg-brand-600 px-4 py-2 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-white">
                  Yes, show me the updated plan
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start border-t border-solid border-neutral-border bg-white px-4 py-3">
            <div className="flex w-full items-center gap-2 rounded-xl border border-solid border-neutral-border bg-white px-2 py-2">
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherPlus />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
              <TextFieldUnstyled className="h-auto grow shrink-0 basis-0">
                <TextFieldUnstyled.Input
                  placeholder="Message..."
                  value=""
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
                />
              </TextFieldUnstyled>
              <IconButton
                variant="brand-primary"
                size="small"
                icon={<FeatherArrowUp />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
}

export default NabuChat;
