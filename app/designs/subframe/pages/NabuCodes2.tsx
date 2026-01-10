"use client";

import React from "react";
import { Badge } from "~/ui/components/Badge";
import { Button } from "~/ui/components/Button";
import { DropdownMenu } from "~/ui/components/DropdownMenu";
import { IconButton } from "~/ui/components/IconButton";
import { TextField } from "~/ui/components/TextField";
import { DefaultPageLayout } from "~/ui/layouts/DefaultPageLayout";
import { FeatherChevronsLeft } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherMoreHorizontal } from "@subframe/core";
import { FeatherPin } from "@subframe/core";
import { FeatherPlus } from "@subframe/core";
import { FeatherSearch } from "@subframe/core";
import { FeatherShare2 } from "@subframe/core";
import { FeatherTrash } from "@subframe/core";
import { FeatherX } from "@subframe/core";
import * as SubframeCore from "@subframe/core";

function NabuCodes2() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full cursor-pointer items-start bg-default-background">
        <div className="flex w-72 flex-none flex-col items-start gap-4 self-stretch border-r border-solid border-neutral-border bg-default-background px-4 py-6 relative">
          <IconButton
            className="absolute top-4 -right-4 z-10"
            variant="brand-secondary"
            size="small"
            icon={<FeatherChevronsLeft />}
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
          />
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-heading-2 font-heading-2 text-default-font">
              Documents
            </span>
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
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1 rounded-md border border-solid border-neutral-border bg-default-background px-1 py-1">
              <Button
                variant="neutral-secondary"
                size="small"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Modified
              </Button>
              <Button
                variant="neutral-tertiary"
                size="small"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              >
                Name
              </Button>
            </div>
            <Button
              variant="brand-primary"
              size="small"
              icon={<FeatherPlus />}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
            >
              New
            </Button>
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-4 overflow-auto">
            <div className="flex w-full flex-col items-start gap-1">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  PINNED
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-brand-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body-bold font-body-bold text-default-font">
                    Habitat Destruction Framework
                  </span>
                  <div className="flex w-full items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 2 hours ago
                    </span>
                    <Badge variant="brand" icon={null}>
                      Framework
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Research Paper Draft
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 3 days ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Paper
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex w-full flex-col items-start gap-1">
              <div className="flex w-full items-center gap-2 px-2 py-1">
                <span className="text-caption-bold font-caption-bold text-subtext-color">
                  ALL DOCUMENTS
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Amazon Rainforest Case Study
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited yesterday
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Corpus
                    </Badge>
                    <Badge variant="neutral" icon={null}>
                      Field Notes
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Literature Review Notes
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 1 week ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Literature
                    </Badge>
                    <Badge variant="neutral" icon={null}>
                      Review
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Species Survey Data
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 2 weeks ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Corpus
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-3 rounded-md bg-neutral-50 px-4 py-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-body font-body text-default-font">
                    Methodology &amp; Approach
                  </span>
                  <div className="flex w-full flex-wrap items-center gap-2">
                    <span className="text-caption font-caption text-subtext-color">
                      Edited 3 weeks ago
                    </span>
                    <Badge variant="neutral" icon={null}>
                      Framework
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex grow shrink-0 basis-0 flex-col items-start self-stretch">
          <div className="flex w-full flex-col items-start gap-3 border-b border-solid border-neutral-border px-6 py-4">
            <div className="flex w-full items-start gap-2">
              <div className="flex grow shrink-0 basis-0 items-center gap-2">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Tooltip Design Samples
                </span>
              </div>
              <IconButton
                variant="brand-tertiary"
                size="small"
                icon={<FeatherPin />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
              <IconButton
                size="small"
                icon={<FeatherShare2 />}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
              />
              <SubframeCore.DropdownMenu.Root>
                <SubframeCore.DropdownMenu.Trigger asChild={true}>
                  <IconButton
                    size="small"
                    icon={<FeatherMoreHorizontal />}
                    onClick={(event: React.MouseEvent<HTMLButtonElement>) => {}}
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
                      <DropdownMenu.DropdownItem icon={<FeatherCopy />}>
                        Duplicate
                      </DropdownMenu.DropdownItem>
                      <DropdownMenu.DropdownItem icon={<FeatherFileText />}>
                        Export
                      </DropdownMenu.DropdownItem>
                      <DropdownMenu.DropdownItem icon={<FeatherTrash />}>
                        Delete
                      </DropdownMenu.DropdownItem>
                    </DropdownMenu>
                  </SubframeCore.DropdownMenu.Content>
                </SubframeCore.DropdownMenu.Portal>
              </SubframeCore.DropdownMenu.Root>
            </div>
          </div>
          <div className="flex w-full grow shrink-0 basis-0 flex-col items-start px-24 py-8 overflow-auto mobile:px-6 mobile:py-6">
            <div className="flex w-full max-w-[768px] flex-col items-start gap-12">
              <div className="flex w-full flex-col items-start gap-4">
                <span className="text-heading-1 font-heading-1 text-default-font">
                  Highlight Tooltip Designs
                </span>
                <span className="text-body font-body text-subtext-color">
                  Gradient header with titled entries and multi-line
                  descriptions
                </span>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Single Highlight - Yellow
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm bg-[#fef3c7] border border-solid border-[#fcd34d] px-1">
                    systematic approach
                  </span>
                  <div className="flex w-72 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-[#fcd34dff]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#fcd34dff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Methodology Reference
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            This phrase appears in 3 key papers as a standard
                            approach definition
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Single Highlight - Green
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm bg-[#dcfce7] border border-solid border-[#86efac] px-1">
                    positive conservation outcomes
                  </span>
                  <div className="flex w-72 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-[#86efacff]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#86efacff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Success Indicator
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Marks verified positive impact on biodiversity
                            metrics
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Single Highlight - Pink
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm bg-[#fce7f3] border border-solid border-[#f9a8d4] px-1">
                    requires verification
                  </span>
                  <div className="flex w-72 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-[#f9a8d4ff]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#f9a8d4ff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Needs Citation
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Statement should be backed by peer-reviewed source
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Double Highlight - Blue + Yellow
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm px-1 bg-[repeating-linear-gradient(45deg,#dbeafe,#dbeafe_8px,#fef3c7_8px,#fef3c7_16px)] border border-solid border-[#93c5fd]">
                    adaptive management strategies
                  </span>
                  <div className="flex w-80 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-gradient-to-r from-[#93c5fd] to-[#fcd34d]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#93c5fdff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Framework Connection
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Links to the theoretical framework discussed in
                            Chapter 2
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#fcd34dff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Best Practice
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Identified as recommended approach in conservation
                            guidelines
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Double Highlight - Green + Pink
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm px-1 bg-[repeating-linear-gradient(45deg,#dcfce7,#dcfce7_8px,#fce7f3_8px,#fce7f3_16px)] border border-solid border-[#86efac]">
                    42% species decline
                  </span>
                  <div className="flex w-80 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-gradient-to-r from-[#86efac] to-[#f9a8d4]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#86efacff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Critical Data Point
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Central finding from 24-ecosystem longitudinal study
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#f9a8d4ff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Verify Source
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Cross-check this statistic against original research
                            data
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Triple Highlight - Yellow + Green + Pink
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm px-1 bg-[repeating-linear-gradient(45deg,#fef3c7,#fef3c7_6px,#dcfce7_6px,#dcfce7_12px,#fce7f3_12px,#fce7f3_18px)] border border-solid border-[#fcd34d]">
                    community-led conservation
                  </span>
                  <div className="flex w-80 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-gradient-to-r from-[#fcd34d] via-[#86efac] to-[#f9a8d4]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#fcd34dff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Key Concept
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Core theme throughout the research framework
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#86efacff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Success Factor
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            73% success rate when properly implemented
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#f9a8d4ff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Define Further
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Add specific examples of community-led initiatives
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex w-full flex-col items-start gap-6">
                <span className="text-heading-2 font-heading-2 text-default-font">
                  Triple Highlight - Blue + Yellow + Green
                </span>
                <div className="flex w-full items-start gap-4">
                  <span className="text-body font-body text-default-font rounded-sm px-1 bg-[repeating-linear-gradient(45deg,#dbeafe,#dbeafe_6px,#fef3c7_6px,#fef3c7_12px,#dcfce7_12px,#dcfce7_18px)] border border-solid border-[#93c5fd]">
                    indigenous land stewardship
                  </span>
                  <div className="flex w-80 flex-none flex-col items-start overflow-hidden rounded-lg border border-solid border-neutral-border bg-default-background shadow-lg">
                    <div className="flex h-1 w-full flex-none items-start bg-gradient-to-r from-[#93c5fd] via-[#fcd34d] to-[#86efac]" />
                    <div className="flex w-full flex-col items-start gap-3 px-3 py-3">
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#93c5fdff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Policy Recommendation
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Should be incorporated into national conservation
                            policy
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#fcd34dff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Historical Context
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            Traditional practices spanning centuries of
                            ecosystem knowledge
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                      <div className="flex w-full items-start gap-2">
                        <div className="flex h-3 w-3 flex-none items-start rounded-full bg-[#86efacff] mt-0.5" />
                        <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                          <span className="text-body-bold font-body-bold text-default-font">
                            Proven Effectiveness
                          </span>
                          <span className="text-caption font-caption text-subtext-color">
                            65% lower degradation rates in indigenous-managed
                            areas
                          </span>
                        </div>
                        <IconButton
                          variant="neutral-tertiary"
                          size="small"
                          icon={<FeatherX />}
                          onClick={(
                            event: React.MouseEvent<HTMLButtonElement>
                          ) => {}}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
}

export default NabuCodes2;
