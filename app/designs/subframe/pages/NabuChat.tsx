"use client";

import React from "react";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { IconButton } from "~/ui/components/IconButton";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { Tabs } from "~/ui/components/Tabs";
import { TextFieldUnstyled } from "~/ui/components/TextFieldUnstyled";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout";
import { FeatherArrowRight, FeatherArrowUp, FeatherBarChart2, FeatherBookmark, FeatherBookmarkCheck, FeatherCheck, FeatherChevronRight, FeatherCircle, FeatherEdit3, FeatherFileText, FeatherHash, FeatherHistory, FeatherLayout, FeatherLightbulb, FeatherMessageSquare, FeatherMinus, FeatherPlus, FeatherSearch, FeatherSparkles, FeatherTag, FeatherTrash, FeatherType } from "@subframe/core";

function NabuChat() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full items-center justify-center bg-neutral-100 px-8 py-8">
        <div className="flex h-144 max-w-[384px] grow shrink-0 basis-0 flex-col items-start overflow-hidden rounded-xl border border-solid border-neutral-border bg-white shadow-[0px_20px_25px_-5px_#000000ff,0px_8px_10px_-6px_#000000ff]">
          <div className="flex w-full flex-col items-start border-b border-solid border-neutral-border bg-white pt-3">
            <div className="flex w-full items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center rounded-md bg-brand-100 px-1.5 py-1.5">
                  <FeatherSparkles className="text-body font-body text-brand-700" />
                </div>
                <span className="text-body-bold font-body-bold text-default-font">
                  Nabu
                </span>
              </div>
              <div className="flex grow shrink-0 basis-0 items-center gap-4" />
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherMinus />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <div className="flex w-full items-start px-4">
              <Tabs>
                <Tabs.Item active={false} icon={<FeatherMessageSquare />}>
                  Chat
                </Tabs.Item>
                <Tabs.Item active={true} icon={<FeatherHistory />}>
                  History
                </Tabs.Item>
              </Tabs>
            </div>
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 bg-neutral-50 px-4 py-4 overflow-y-auto">
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex w-full items-center gap-2 py-1">
                <span className="font-['Manrope'] text-[12px] font-[500] leading-[16px] tracking-wider text-subtext-color uppercase">
                  Today
                </span>
                <div className="flex h-px grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-white px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="brand"
                    size="small"
                    icon={<FeatherTag />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Applied codeFiscal State Reporting
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherFileText className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Ministerraad 20 May.md
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    2m
                  </span>
                </div>
                <div className="flex w-full items-start pl-8">
                  <div className="flex grow shrink-0 basis-0 flex-col items-start rounded-xl bg-brand-50 px-3 py-2">
                    <span className="line-clamp-2 w-full text-caption font-caption text-brand-700 italic">
                      &quot;...reporting about the state of public finances
                      during COVID...&quot;
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-white px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="neutral"
                    size="small"
                    icon={<FeatherEdit3 />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Updated annotationAppeal to Expertise
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherFileText className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Ministerraad 20 May.md
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    15m
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-error-50 px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="error"
                    size="small"
                    icon={<FeatherTrash />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Deleted highlight
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherFileText className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Transcript_V2_Final.docx
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    45m
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex w-full items-center gap-2 py-1">
                <span className="font-['Manrope'] text-[12px] font-[500] leading-[16px] tracking-wider text-subtext-color uppercase">
                  Yesterday
                </span>
                <div className="flex h-px grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-success-50 px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="success"
                    size="small"
                    icon={<FeatherPlus />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Created new codePrivacy &amp; Data Protection
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherHash className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Global Codes
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    10:23 AM
                  </span>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-white px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="brand"
                    size="small"
                    icon={<FeatherTag />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Applied codeResponsibilization
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherFileText className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Interview_Rutte_May2020.pdf
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    9:45 AM
                  </span>
                </div>
                <div className="flex w-full items-start pl-8">
                  <div className="flex grow shrink-0 basis-0 flex-col items-start rounded-xl bg-brand-50 px-3 py-2">
                    <span className="line-clamp-2 w-full text-caption font-caption text-brand-700 italic">
                      &quot;...we must all watch out for ourselves as
                      well...&quot;
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-white px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="neutral"
                    size="small"
                    icon={<FeatherType />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Added text to sectionIntroductory Statement
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherFileText className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Ministerraad 20 May.md
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    9:12 AM
                  </span>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-3">
              <div className="flex w-full items-center gap-2 py-1">
                <span className="font-['Manrope'] text-[12px] font-[500] leading-[16px] tracking-wider text-subtext-color uppercase">
                  Last Week
                </span>
                <div className="flex h-px grow shrink-0 basis-0 flex-col items-center gap-2 bg-neutral-border" />
              </div>
              <div className="flex w-full flex-col items-start gap-2 rounded-xl bg-white px-4 py-3 cursor-pointer hover:shadow-md transition-all">
                <div className="flex w-full items-start gap-3">
                  <IconWithBackground
                    className="mt-0.5"
                    variant="brand"
                    size="small"
                    icon={<FeatherBarChart2 />}
                  />
                  <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                    <span className="text-body font-body text-default-font">
                      Generated chartCode Frequency Analysis
                    </span>
                    <div className="flex w-full items-center gap-1.5">
                      <FeatherLayout className="text-caption font-caption text-subtext-color" />
                      <span className="text-caption font-caption text-subtext-color">
                        Dashboard
                      </span>
                    </div>
                  </div>
                  <span className="text-caption font-caption text-neutral-400">
                    May 18
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col items-start border-t border-solid border-neutral-border bg-white px-4 py-3">
            <div className="flex w-full items-center gap-2 rounded-xl border border-solid border-neutral-border bg-white px-2 py-2">
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherSearch />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
              <TextFieldUnstyled className="h-auto grow shrink-0 basis-0">
                <TextFieldUnstyled.Input
                  placeholder="Search history..."
                  value=""
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
                />
              </TextFieldUnstyled>
            </div>
          </div>
        </div>
        <div className="flex h-144 max-w-[448px] grow shrink-0 basis-0 flex-col items-start overflow-hidden rounded-xl border border-solid border-neutral-border bg-white shadow-lg">
          <div className="flex w-full flex-col items-start border-b border-solid border-neutral-border bg-white pt-3">
            <div className="flex w-full items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center rounded-md bg-brand-100 px-1.5 py-1.5">
                  <FeatherSparkles className="text-body font-body text-brand-700" />
                </div>
                <span className="text-body-bold font-body-bold text-default-font">
                  Nabu
                </span>
              </div>
              <div className="flex grow shrink-0 basis-0 items-center gap-4" />
              <IconButton
                variant="neutral-tertiary"
                size="small"
                icon={<FeatherMinus />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
            <div className="flex w-full items-start px-4">
              <Tabs>
                <Tabs.Item active={true} icon={<FeatherMessageSquare />}>
                  Chat
                </Tabs.Item>
                <Tabs.Item active={false} icon={<FeatherHistory />}>
                  History
                </Tabs.Item>
              </Tabs>
            </div>
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-3 bg-neutral-50 px-4 py-4 overflow-auto">
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-3xl bg-brand-50 px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-brand-900">
                  Can you help me build a conservation plan for the rainforest
                  region?
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-3xl bg-white px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  I&#39;ll research the latest conservation strategies and
                  create a plan for you.
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start rounded-3xl bg-white px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  Should I focus on any specific aspect like funding or
                  community engagement?
                </span>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1.5">
              <div className="flex w-full items-center gap-2 rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Community engagement strategies
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-2">
                <div className="flex w-full items-center gap-2 rounded-xl border-2 border-solid border-brand-600 bg-brand-50 px-3 py-2 shadow-sm">
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
              <div className="flex w-full items-center gap-2 rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Biodiversity monitoring
                </span>
              </div>
            </div>
            <div className="flex w-full items-start">
              <div className="flex flex-col items-start gap-2 max-w-[80%]">
                <div className="flex w-full flex-col items-start gap-1.5">
                  <div className="flex w-full items-center justify-between rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                    <FeatherChevronRight className="text-body font-body text-neutral-400" />
                    <span className="text-body font-body text-default-font grow">
                      Community engagement strategies
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-xl border-2 border-solid border-brand-600 bg-brand-50 px-3 py-2 shadow-sm">
                    <FeatherCheck className="text-body font-body text-brand-600" />
                    <span className="text-body-bold font-body-bold text-brand-700 grow">
                      Sustainable funding mechanisms
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                    <FeatherChevronRight className="text-body font-body text-neutral-400" />
                    <span className="text-body font-body text-default-font grow">
                      Biodiversity monitoring
                    </span>
                  </div>
                  <div className="flex w-full items-center justify-between rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                    <FeatherChevronRight className="text-body font-body text-neutral-400" />
                    <span className="text-body font-body text-default-font grow">
                      All of the above
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1.5">
              <div className="flex w-full items-center gap-2 rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Community engagement strategies
                </span>
              </div>
              <div className="flex w-full items-center gap-2 rounded-xl border-2 border-solid border-brand-600 bg-brand-50 px-3 py-2 shadow-sm">
                <FeatherCheck className="text-body font-body text-brand-600" />
                <span className="text-body-bold font-body-bold text-brand-700 grow">
                  Sustainable funding mechanisms
                </span>
                <Badge variant="success" icon={<FeatherBookmarkCheck />}>
                  Saved
                </Badge>
              </div>
              <div className="flex w-full items-center gap-2 rounded-xl border border-solid border-neutral-border bg-white px-3 py-2 hover:bg-neutral-50 transition-colors">
                <FeatherCircle className="text-body font-body text-neutral-400" />
                <span className="text-body font-body text-default-font grow">
                  Biodiversity monitoring
                </span>
              </div>
            </div>
            <div className="flex h-2 w-full flex-none items-start" />
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-3xl bg-brand-50 px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-brand-900">
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
                  <div className="flex flex-col items-start rounded-2xl bg-white px-3 py-1.5 shadow-sm max-w-[90%]">
                    <span className="text-caption font-caption text-default-font">
                      How many stakeholder groups should we prioritize?
                    </span>
                  </div>
                </div>
                <div className="flex h-1 w-full flex-none items-start" />
                <div className="flex w-full items-end justify-end">
                  <div className="flex flex-col items-start rounded-2xl bg-brand-50 px-3 py-1.5 shadow-sm max-w-[90%]">
                    <span className="text-caption font-caption text-brand-900">
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
              <div className="flex flex-col items-start rounded-3xl bg-white px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  I&#39;m working on the stakeholder framework. The plan will be
                  ready in a few minutes.
                </span>
              </div>
            </div>
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-3xl bg-brand-50 px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-brand-900">
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
              <div className="flex flex-col items-start rounded-3xl bg-white px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-default-font">
                  Perfect! I&#39;ve added those examples to the plan. Would you
                  like to review it now?
                </span>
              </div>
            </div>
            <div className="flex w-full items-end justify-end">
              <div className="flex flex-col items-start rounded-3xl bg-brand-50 px-4 py-3 shadow-sm max-w-[80%]">
                <span className="text-body font-body text-brand-900">
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
