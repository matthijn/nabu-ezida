"use client";

import React from "react";
import { Avatar } from "~/ui/components/Avatar";
import { FeatherAlertTriangle } from "@subframe/core";
import { FeatherArrowRight } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherCircle } from "@subframe/core";
import { FeatherHelpCircle } from "@subframe/core";
import { FeatherLightbulb } from "@subframe/core";
import { FeatherLoader2 } from "@subframe/core";

function NabuDocuments3() {
  return (
    <div className="flex w-full max-w-[512px] flex-col items-start gap-6 p-4">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-2 font-heading-2 text-default-font">
          Chat Step Rendering
        </span>
        <span className="text-body font-body text-subtext-color">
          Unified pattern for plan and exploration steps in chat
        </span>
      </div>

      {/* Example 1: Exploration flow with ask */}
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          Exploration with Ask
        </span>

        {/* User message */}
        <div className="flex w-full justify-end">
          <div className="flex max-w-[80%] items-start gap-2">
            <div className="flex flex-col items-end gap-1 rounded-lg bg-brand-100 px-3 py-2">
              <span className="text-body font-body text-default-font">
                What conservation strategies work best in tropical regions?
              </span>
            </div>
            <Avatar
              size="x-small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
          </div>
        </div>

        {/* Steps block */}
        <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
          <div className="flex w-full items-start gap-2">
            <FeatherArrowRight className="text-body font-body text-neutral-400 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Searching for conservation research papers
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Found 47 relevant studies from past 5 years
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherLightbulb className="text-body font-body text-brand-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Community-led models show 40% better outcomes
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Analyzed funding source differences
            </span>
          </div>
          {/* Ask box */}
          <div className="flex w-full items-start gap-2 rounded-md border border-solid border-brand-300 bg-brand-50 px-3 py-2 mt-1">
            <FeatherHelpCircle className="text-body font-body text-brand-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-brand-700">
              Which region should I focus on: Southeast Asia, Amazon Basin, or Central Africa?
            </span>
          </div>
        </div>

        {/* User answer */}
        <div className="flex w-full justify-end">
          <div className="flex max-w-[80%] items-start gap-2">
            <div className="flex flex-col items-end gap-1 rounded-lg bg-brand-100 px-3 py-2">
              <span className="text-body font-body text-default-font">
                Southeast Asia please
              </span>
            </div>
            <Avatar
              size="x-small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
          </div>
        </div>

        {/* Steps continue */}
        <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
          <div className="flex w-full items-start gap-2">
            <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Narrowed focus to Southeast Asia region
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherLightbulb className="text-body font-body text-brand-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Mangrove restoration shows highest success rates
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherLoader2 className="text-body font-body text-brand-600 mt-0.5 flex-none animate-spin" />
            <span className="text-body font-body text-brand-700">
              Compiling final recommendations...
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex w-full items-center gap-2">
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* Example 2: Plan flow with pending steps */}
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          Plan Execution
        </span>

        {/* User message */}
        <div className="flex w-full justify-end">
          <div className="flex max-w-[80%] items-start gap-2">
            <div className="flex flex-col items-end gap-1 rounded-lg bg-brand-100 px-3 py-2">
              <span className="text-body font-body text-default-font">
                Add dark mode to the settings page
              </span>
            </div>
            <Avatar
              size="x-small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
          </div>
        </div>

        {/* Steps block */}
        <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
          <div className="flex w-full items-start gap-2">
            <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Create theme context and provider
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Add toggle component to settings
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherLoader2 className="text-body font-body text-brand-600 mt-0.5 flex-none animate-spin" />
            <span className="text-body font-body text-brand-700">
              Updating color tokens for dark theme
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherCircle className="text-body font-body text-neutral-300 mt-0.5 flex-none" />
            <span className="text-body font-body text-neutral-400">
              Test theme persistence
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherCircle className="text-body font-body text-neutral-300 mt-0.5 flex-none" />
            <span className="text-body font-body text-neutral-400">
              Run tests and verify
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex w-full items-center gap-2">
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* Example 3: Aborted flow */}
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          Aborted
        </span>

        {/* User message */}
        <div className="flex w-full justify-end">
          <div className="flex max-w-[80%] items-start gap-2">
            <div className="flex flex-col items-end gap-1 rounded-lg bg-brand-100 px-3 py-2">
              <span className="text-body font-body text-default-font">
                Refactor the entire auth system
              </span>
            </div>
            <Avatar
              size="x-small"
              image="https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif"
            >
              A
            </Avatar>
          </div>
        </div>

        {/* Steps block with abort */}
        <div className="flex w-full flex-col items-start gap-2 rounded-lg bg-neutral-50 px-3 py-3">
          <div className="flex w-full items-start gap-2">
            <FeatherCheck className="text-body font-body text-success-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Analyzed current auth implementation
            </span>
          </div>
          <div className="flex w-full items-start gap-2">
            <FeatherArrowRight className="text-body font-body text-neutral-400 mt-0.5 flex-none" />
            <span className="text-body font-body text-default-font">
              Started migration to new token format
            </span>
          </div>
          {/* Abort box */}
          <div className="flex w-full items-start gap-2 rounded-md border border-solid border-warning-300 bg-warning-50 px-3 py-2 mt-1">
            <FeatherAlertTriangle className="text-body font-body text-warning-600 mt-0.5 flex-none" />
            <span className="text-body font-body text-warning-700">
              Cancelled by user
            </span>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex w-full items-center gap-2">
        <div className="h-px flex-1 bg-neutral-200" />
      </div>

      {/* Icon Legend */}
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-caption-bold font-caption-bold text-subtext-color">
          Icon Legend
        </span>
        <div className="flex w-full flex-col items-start gap-1 rounded-lg bg-neutral-50 px-3 py-3">
          <div className="flex w-full items-center gap-3">
            <FeatherArrowRight className="text-body font-body text-neutral-400 flex-none" />
            <span className="text-caption font-caption text-subtext-color">
              Intent / Direction
            </span>
          </div>
          <div className="flex w-full items-center gap-3">
            <FeatherCheck className="text-body font-body text-success-600 flex-none" />
            <span className="text-caption font-caption text-subtext-color">
              Completed
            </span>
          </div>
          <div className="flex w-full items-center gap-3">
            <FeatherLightbulb className="text-body font-body text-brand-600 flex-none" />
            <span className="text-caption font-caption text-subtext-color">
              Discovery / Insight
            </span>
          </div>
          <div className="flex w-full items-center gap-3">
            <FeatherLoader2 className="text-body font-body text-brand-600 flex-none animate-spin" />
            <span className="text-caption font-caption text-subtext-color">
              In Progress
            </span>
          </div>
          <div className="flex w-full items-center gap-3">
            <FeatherCircle className="text-body font-body text-neutral-300 flex-none" />
            <span className="text-caption font-caption text-subtext-color">
              Pending
            </span>
          </div>
          <div className="flex w-full items-center gap-3">
            <FeatherHelpCircle className="text-body font-body text-brand-600 flex-none" />
            <span className="text-caption font-caption text-subtext-color">
              Ask (green box)
            </span>
          </div>
          <div className="flex w-full items-center gap-3">
            <FeatherAlertTriangle className="text-body font-body text-warning-600 flex-none" />
            <span className="text-caption font-caption text-subtext-color">
              Abort (yellow box)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NabuDocuments3;
