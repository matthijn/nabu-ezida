"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { Badge } from "~/ui/components/Badge";
import { IconButton } from "~/ui/components/IconButton";
import { IconWithBackground } from "~/ui/components/IconWithBackground";
import { LinkButton } from "~/ui/components/LinkButton";
import { TextField } from "~/ui/components/TextField";
import { ToggleGroup } from "~/ui/components/ToggleGroup";
import { FeatherBarChart2 } from "@subframe/core";
import { FeatherBookmark } from "@subframe/core";
import { FeatherBookOpen } from "@subframe/core";
import { FeatherChevronDown } from "@subframe/core";
import { FeatherChevronLeft } from "@subframe/core";
import { FeatherChevronRight } from "@subframe/core";
import { FeatherExternalLink } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherLayers } from "@subframe/core";
import { FeatherPlus } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherTable } from "@subframe/core";

function SearchPreview() {
  return (
    <div className="flex h-full w-full items-start overflow-hidden bg-default-background">
      <div className="flex w-20 flex-none flex-col items-center justify-between self-stretch border-r border-solid border-neutral-border bg-default-background py-6 mobile:hidden">
        <div className="flex w-full flex-col items-center gap-8">
          <IconWithBackground
            variant="neutral"
            size="large"
            icon={<FeatherLayers />}
          />
          <div className="flex w-full flex-col items-center gap-2 px-2">
            <div className="flex w-full flex-col items-center gap-1 rounded-md px-2 py-3 cursor-pointer hover:bg-neutral-50">
              <FeatherFileText className="text-heading-3 font-heading-3 text-neutral-400" />
              <span className="text-caption font-caption text-neutral-400">
                Documents
              </span>
            </div>
            <div className="flex w-full flex-col items-center gap-1 rounded-md bg-brand-50 px-2 py-3 cursor-pointer">
              <FeatherSearch className="text-heading-3 font-heading-3 text-brand-600" />
              <span className="text-caption font-caption text-brand-700">
                Search
              </span>
            </div>
            <div className="flex w-full flex-col items-center gap-1 rounded-md px-2 py-3 cursor-pointer hover:bg-neutral-50">
              <FeatherBookOpen className="text-heading-3 font-heading-3 text-neutral-400" />
              <span className="text-caption font-caption text-neutral-400">
                Codes
              </span>
            </div>
          </div>
        </div>
        <Avatar
          size="medium"
          image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=256&q=80"
        >
          JD
        </Avatar>
      </div>
      <div className="flex w-80 flex-none flex-col items-start self-stretch border-r border-solid border-neutral-border bg-default-background mobile:hidden">
        <div className="flex w-full items-center justify-between px-6 py-6">
          <span className="text-heading-2 font-heading-2 text-default-font">
            Search
          </span>
          <IconButton
            size="small"
            icon={<FeatherPlus />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
        </div>
        <div className="flex w-full flex-col items-start px-6 pb-4">
          <TextField
            className="h-auto w-full flex-none"
            variant="filled"
            label=""
            helpText=""
            icon={<FeatherSearch />}
          >
            <TextField.Input
              placeholder="Search documents..."
              value=""
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {}}
            />
          </TextField>
        </div>
        <div className="flex w-full flex-col items-start pt-2">
          <div className="flex w-full items-center justify-between px-6 py-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color">
              RECENT SEARCHES
            </span>
          </div>
          <div className="flex w-full items-center justify-between px-6 py-3 cursor-pointer hover:bg-neutral-50">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-3">
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherBookmark />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-body font-body text-default-font">
                  Q1 Research
                </span>
              </div>
              <span className="text-caption font-caption text-subtext-color pl-10">
                Framework documents, published Jan-Mar 2024
              </span>
            </div>
            <span className="text-caption font-caption text-subtext-color rounded-sm bg-neutral-100 px-2 py-0.5">
              156
            </span>
          </div>
          <div className="flex w-full items-center justify-between px-6 py-3 cursor-pointer hover:bg-neutral-50">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-3">
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherBookmark />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-body font-body text-default-font">
                  Field Notes 2022
                </span>
              </div>
              <span className="text-caption font-caption text-subtext-color pl-10">
                Corpus tagged Field Notes, dated 2022
              </span>
            </div>
            <span className="text-caption font-caption text-subtext-color rounded-sm bg-neutral-100 px-2 py-0.5">
              89
            </span>
          </div>
          <div className="flex w-full items-center justify-between px-6 py-3 cursor-pointer hover:bg-neutral-50">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-3">
                <IconButton
                  variant="neutral-tertiary"
                  size="small"
                  icon={<FeatherBookmark />}
                  onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                />
                <span className="text-body font-body text-default-font">
                  Policy Reviews
                </span>
              </div>
              <span className="text-caption font-caption text-subtext-color pl-10">
                Literature reviews mentioning policy frameworks
              </span>
            </div>
            <span className="text-caption font-caption text-subtext-color rounded-sm bg-neutral-100 px-2 py-0.5">
              12
            </span>
          </div>
          <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-200 my-2" />
          <div className="flex w-full items-center justify-between px-6 py-2">
            <span className="text-caption-bold font-caption-bold text-subtext-color">
              SAVED SEARCHES
            </span>
          </div>
          <div className="flex w-full items-center justify-between border-l-4 border-solid border-brand-600 bg-brand-50 px-5 py-3 cursor-pointer">
            <div className="flex flex-col items-start gap-1">
              <div className="flex items-center gap-3">
                <FeatherBookmark className="text-body font-body text-brand-600" />
                <span className="text-body-bold font-body-bold text-brand-700">
                  Critical Habitats
                </span>
              </div>
              <span className="text-caption font-caption text-brand-600 pl-7">
                Protected zones and conservation areas
              </span>
            </div>
            <span className="text-caption font-caption text-brand-700 rounded-sm bg-brand-100 px-2 py-0.5">
              24
            </span>
          </div>
        </div>
      </div>
      <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch overflow-hidden">
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-6 bg-default-background px-12 py-8 overflow-auto mobile:px-4 mobile:py-4">
          <div className="flex w-full max-w-[1024px] flex-col items-start gap-6">
            <div className="flex w-full flex-col items-center gap-8 py-12">
              <span className="text-heading-1 font-heading-1 text-default-font">
                Filter Searches
              </span>
              <div className="flex w-full max-w-[768px] flex-col items-center gap-4">
                <div className="flex w-full flex-col items-start gap-2 rounded-xl border border-solid border-neutral-300 bg-white px-6 py-5 shadow-lg">
                  <div className="flex w-full items-center gap-4">
                    <FeatherSearch className="font-['Manrope'] text-[32px] font-[400] leading-[48px] text-neutral-400" />
                    <TextField
                      className="h-auto grow shrink-0 basis-0"
                      variant="filled"
                      label=""
                      helpText=""
                      icon={null}
                    >
                      <TextField.Input
                        className="text-[24px] leading-[32px]"
                        placeholder="Show me all documents about habitat loss before 2022"
                        value=""
                        onChange={(
                          event: React.ChangeEvent<HTMLInputElement>
                        ) => {}}
                      />
                    </TextField>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-body font-body text-subtext-color">
                    Filter by tag:
                  </span>
                  <ToggleGroup value="" onValueChange={(value: string) => {}}>
                    <ToggleGroup.Item icon={null} value="3d6f5466">
                      All
                    </ToggleGroup.Item>
                    <ToggleGroup.Item icon={null} value="3eaa07e2">
                      Framework
                    </ToggleGroup.Item>
                    <ToggleGroup.Item icon={null} value="98c6d5ef">
                      Corpus
                    </ToggleGroup.Item>
                    <ToggleGroup.Item icon={null} value="7aab6809">
                      Literature
                    </ToggleGroup.Item>
                  </ToggleGroup>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-body-bold font-body-bold text-default-font">
                  24 results
                </span>
                <span className="text-body font-body text-subtext-color">
                  across 8 documents
                </span>
              </div>
            </div>
            <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-200" />
            <div className="flex w-full flex-col items-start gap-6">
              <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
                <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
                  <FeatherFileText className="text-body font-body text-brand-600" />
                  <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
                    Habitat Destruction Framework
                  </span>
                  <Badge variant="brand" icon={null}>
                    Framework
                  </Badge>
                  <Badge variant="neutral" icon={null}>
                    Ecology
                  </Badge>
                  <span className="text-caption font-caption text-subtext-color">
                    6 matches
                  </span>
                  <IconButton
                    size="small"
                    icon={<FeatherExternalLink />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                </div>
                <div className="flex w-full flex-col items-start gap-4 px-6 py-5">
                  <div className="flex w-full flex-col items-start gap-2 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
                    <span className="text-caption font-caption text-subtext-color">
                      Line 42
                    </span>
                    <span className="text-heading-3 font-heading-3 text-default-font">
                      Executive Summary
                    </span>
                    <div className="flex w-full flex-wrap gap-1 items-baseline">
                      <span className="text-body font-body text-default-font">
                        This framework establishes a systematic approach to
                        understanding and addressing
                      </span>
                      <span className="text-body-bold font-body-bold text-default-font rounded-sm bg-warning-100 px-1">
                        habitat destruction
                      </span>
                      <span className="text-body font-body text-default-font">
                        in critical ecosystems. Through extensive field research
                        and data analysis, we identify key drivers of
                        degradation and propose evidence-based interventions for
                        biodiversity preservation.
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-solid border-brand-600 bg-white px-6 py-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <FeatherBarChart2 className="text-body font-body text-brand-600" />
                      <span className="text-body-bold font-body-bold text-brand-600">
                        Deforestation Rates by Region
                      </span>
                    </div>
                    <div className="flex w-full items-end justify-between">
                      <div className="flex flex-col items-center justify-end gap-2 flex-1">
                        <div className="flex w-full items-start rounded-t-md bg-brand-500" />
                        <span className="text-caption font-caption text-default-font">
                          Amazon Basin
                        </span>
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          17.3%
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-end gap-2 flex-1">
                        <div className="flex w-full items-start rounded-t-md bg-brand-500" />
                        <span className="text-caption font-caption text-default-font">
                          Congo Rainforest
                        </span>
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          12.1%
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-end gap-2 flex-1">
                        <div className="flex w-full items-start rounded-t-md bg-brand-500" />
                        <span className="text-caption font-caption text-default-font">
                          Southeast Asia
                        </span>
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          23.7%
                        </span>
                      </div>
                      <div className="flex flex-col items-center justify-end gap-2 flex-1">
                        <div className="flex w-full items-start rounded-t-md bg-brand-500" />
                        <span className="text-caption font-caption text-default-font">
                          Madagascar
                        </span>
                        <span className="text-caption-bold font-caption-bold text-default-font">
                          8.4%
                        </span>
                      </div>
                    </div>
                  </div>
                  <LinkButton
                    variant="neutral"
                    size="small"
                    iconRight={<FeatherChevronDown />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Show 4 more matches
                  </LinkButton>
                </div>
              </div>
              <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
                <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
                  <FeatherFileText className="text-body font-body text-neutral-600" />
                  <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
                    Amazon Rainforest Case Study
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Corpus
                  </Badge>
                  <Badge variant="neutral" icon={null}>
                    Field Notes
                  </Badge>
                  <span className="text-caption font-caption text-subtext-color">
                    8 matches
                  </span>
                  <IconButton
                    size="small"
                    icon={<FeatherExternalLink />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                </div>
                <div className="flex w-full flex-col items-start gap-4 px-6 py-5">
                  <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-solid border-[#93c5fd] bg-[#eff6ff] px-4 py-4">
                    <div className="flex items-center gap-2">
                      <FeatherBookOpen className="text-body font-body text-[#1d4ed8]" />
                      <span className="text-body-bold font-body-bold text-[#1d4ed8]">
                        Codebook Reference
                      </span>
                    </div>
                    <div className="flex w-full flex-col items-start gap-2">
                      <span className="text-body font-body text-default-font">
                        This code refers to instances where participants discuss
                        systematic approaches to data collection. It includes
                        references to
                      </span>
                      <span className="text-body font-body text-default-font rounded-sm bg-warning-100 px-1">
                        methodology and structured frameworks used in
                        qualitative research
                      </span>
                      <span className="text-body font-body text-subtext-color">
                        . The content can extend to multiple paragraphs and
                        detailed explanations without consuming excessive ink
                        when printed.
                      </span>
                    </div>
                  </div>
                  <div className="flex w-full flex-col items-start gap-2 rounded-md border border-solid border-neutral-200 bg-neutral-50 px-4 py-3">
                    <span className="text-caption font-caption text-subtext-color">
                      Line 18
                    </span>
                    <span className="text-heading-2 font-heading-2 text-default-font">
                      Introduction
                    </span>
                    <div className="flex w-full flex-wrap gap-1 items-baseline">
                      <span className="text-body font-body text-default-font">
                        The Amazon Basin represents the largest continuous
                        tropical rainforest and faces unprecedented
                      </span>
                      <span className="text-body-bold font-body-bold text-default-font rounded-sm bg-warning-100 px-1">
                        habitat destruction
                      </span>
                      <span className="text-body font-body text-default-font">
                        from agricultural expansion. Our field observations from
                        2022-2024 document accelerating loss rates in previously
                        protected zones.
                      </span>
                    </div>
                  </div>
                  <LinkButton
                    variant="neutral"
                    size="small"
                    iconRight={<FeatherChevronDown />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Show 6 more matches
                  </LinkButton>
                </div>
              </div>
              <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
                <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
                  <FeatherFileText className="text-body font-body text-neutral-600" />
                  <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
                    Species Survey Data
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Corpus
                  </Badge>
                  <span className="text-caption font-caption text-subtext-color">
                    3 matches
                  </span>
                  <IconButton
                    size="small"
                    icon={<FeatherExternalLink />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                </div>
                <div className="flex w-full flex-col items-start gap-4 px-6 py-5">
                  <div className="flex w-full flex-col items-start gap-3 rounded-lg border border-solid border-brand-600 bg-white px-6 py-5 shadow-sm">
                    <div className="flex items-center gap-2">
                      <FeatherTable className="text-body font-body text-brand-600" />
                      <span className="text-body-bold font-body-bold text-brand-600">
                        Regional Impact Analysis
                      </span>
                    </div>
                    <div className="flex w-full flex-col items-start overflow-hidden rounded-md border border-solid border-neutral-200">
                      <div className="flex w-full items-center border-b border-solid border-neutral-200 bg-neutral-100">
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Region
                          </span>
                        </div>
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Loss Rate
                          </span>
                        </div>
                        <div className="flex items-center px-4 py-3 flex-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Primary Cause
                          </span>
                        </div>
                        <div className="flex w-24 flex-none items-center px-4 py-3">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Status
                          </span>
                        </div>
                      </div>
                      <div className="flex w-full items-center border-b border-solid border-neutral-200">
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            Amazon Basin
                          </span>
                        </div>
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body-bold font-body-bold text-default-font rounded-sm bg-warning-100 px-1">
                            17.3%
                          </span>
                        </div>
                        <div className="flex items-center px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            Agricultural expansion
                          </span>
                        </div>
                        <div className="flex w-24 flex-none items-center px-4 py-3">
                          <Badge variant="error" icon={null}>
                            Critical
                          </Badge>
                        </div>
                      </div>
                      <div className="flex w-full items-center border-b border-solid border-neutral-200">
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            Congo Rainforest
                          </span>
                        </div>
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            12.1%
                          </span>
                        </div>
                        <div className="flex items-center px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            Logging operations
                          </span>
                        </div>
                        <div className="flex w-24 flex-none items-center px-4 py-3">
                          <Badge variant="warning" icon={null}>
                            Warning
                          </Badge>
                        </div>
                      </div>
                      <div className="flex w-full items-center">
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            Southeast Asia
                          </span>
                        </div>
                        <div className="flex items-center border-r border-solid border-neutral-200 px-4 py-3 flex-1">
                          <span className="text-body-bold font-body-bold text-default-font rounded-sm bg-warning-100 px-1">
                            23.7%
                          </span>
                        </div>
                        <div className="flex items-center px-4 py-3 flex-1">
                          <span className="text-body font-body text-default-font">
                            Palm oil cultivation
                          </span>
                        </div>
                        <div className="flex w-24 flex-none items-center px-4 py-3">
                          <Badge variant="error" icon={null}>
                            Critical
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <LinkButton
                    variant="neutral"
                    size="small"
                    iconRight={<FeatherChevronDown />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Show 2 more matches
                  </LinkButton>
                </div>
              </div>
              <div className="flex w-full flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-sm">
                <div className="flex w-full items-center gap-4 border-b border-solid border-neutral-border bg-neutral-50 px-4 py-3">
                  <FeatherFileText className="text-body font-body text-neutral-600" />
                  <span className="grow shrink-0 basis-0 text-body-bold font-body-bold text-default-font">
                    Literature Review Notes
                  </span>
                  <Badge variant="neutral" icon={null}>
                    Literature
                  </Badge>
                  <Badge variant="neutral" icon={null}>
                    Review
                  </Badge>
                  <span className="text-caption font-caption text-subtext-color">
                    5 matches
                  </span>
                  <IconButton
                    size="small"
                    icon={<FeatherExternalLink />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  />
                </div>
                <div className="flex w-full flex-col items-start gap-4 px-6 py-5">
                  <div className="flex w-full flex-col items-start gap-2 rounded-md border-l-2 border-solid border-neutral-300 bg-neutral-50 px-4 py-3">
                    <span className="text-caption font-caption text-subtext-color">
                      Line 156
                    </span>
                    <div className="flex w-full flex-wrap gap-1 items-baseline">
                      <span className="text-monospace-body font-monospace-body text-default-font">
                        ### Key Findings Summary
                      </span>
                    </div>
                    <div className="flex w-full flex-wrap gap-1 items-baseline">
                      <span className="text-monospace-body font-monospace-body text-default-font">
                        Smith et al. (2023) found that
                      </span>
                      <span className="text-monospace-body font-monospace-body text-default-font rounded-sm bg-warning-100 px-1">
                        habitat destruction
                      </span>
                      <span className="text-monospace-body font-monospace-body text-default-font">
                        correlates strongly with biodiversity loss metrics
                        across all studied biomes. Their meta-analysis of 147
                        studies confirms...
                      </span>
                    </div>
                  </div>
                  <LinkButton
                    variant="neutral"
                    size="small"
                    iconRight={<FeatherChevronDown />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
                  >
                    Show 4 more matches
                  </LinkButton>
                </div>
              </div>
            </div>
            <div className="flex w-full items-center justify-center gap-4 py-4">
              <IconButton
                variant="neutral-secondary"
                icon={<FeatherChevronLeft />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-brand-600">
                  <span className="text-body-bold font-body-bold text-white">
                    1
                  </span>
                </div>
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-neutral-100 cursor-pointer">
                  <span className="text-body font-body text-default-font">
                    2
                  </span>
                </div>
                <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-neutral-100 cursor-pointer">
                  <span className="text-body font-body text-default-font">
                    3
                  </span>
                </div>
              </div>
              <IconButton
                variant="neutral-secondary"
                icon={<FeatherChevronRight />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SearchPreview;
