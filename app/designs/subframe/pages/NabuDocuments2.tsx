"use client";

import { Badge } from "~/ui/components/Badge";
import { Conversation, Message, TaskProgress, type Task } from "~/ui/components/ai";
import { type Participant, NABU } from "~/domain/participant";
import { FeatherFile } from "@subframe/core";

const USER: Participant = {
  id: "user-1",
  type: "human",
  name: "You",
  color: "#7c3aed",
  initial: "A",
  image: "https://res.cloudinary.com/subframe/image/upload/v1711417507/shared/fychrij7dzl8wgq2zjq9.avif",
};

const JANE: Participant = {
  id: "jane",
  type: "human",
  name: "Jane",
  color: "#d97706",
  initial: "J",
};

const analysisExampleTasks: Task[] = [
  {
    label: "Gathering regional data",
    status: "done",
    children: [
      { label: "Southeast Asia datasets collected", status: "done" },
      { label: "Amazon Basin datasets collected", status: "done" },
    ],
  },
  {
    label: "Analyzing species trends",
    status: "loading",
    children: [
      { label: "Mammal populations assessed", status: "done" },
      { label: "Bird species analysis in progress", status: "loading" },
      { label: "Reptile and amphibian data pending", status: "pending" },
    ],
  },
  { label: "Cross-referencing conservation efforts", status: "pending" },
  { label: "Generating visualizations", status: "pending" },
  { label: "Writing summary and recommendations", status: "pending" },
];

const noop = () => {};

function NabuDocuments2() {
  return (
    <div className="flex w-full max-w-[768px] flex-col items-start gap-8">
      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 1: Initial Follow-up Question
        </span>
        <Conversation
          initiator={USER}
          recipient={NABU}
          mode="chat"
                    onSend={noop}
          onCancel={noop}
        >
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Can you help me write a conclusion for this section?
            </span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              I'd be happy to help! To write an effective conclusion, I need to know a bit more:
            </span>
            <div className="flex w-full flex-col items-start gap-2 pl-3">
              <div className="flex w-full items-start gap-2">
                <span className="text-body font-body text-default-font">•</span>
                <span className="text-body font-body text-default-font">
                  What are the main points you covered in this section?
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <span className="text-body font-body text-default-font">•</span>
                <span className="text-body font-body text-default-font">
                  What tone are you aiming for (formal, conversational, persuasive)?
                </span>
              </div>
            </div>
          </Message>
        </Conversation>
      </div>

      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 2: Multi-turn Conversation
        </span>
        <Conversation
          initiator={USER}
          recipient={JANE}
          mode="chat"
                    onSend={noop}
          onCancel={noop}
        >
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Add a table comparing the conservation strategies
            </span>
          </Message>
          <Message from={JANE}>
            <span className="text-body font-body text-default-font">
              Which conservation strategies would you like me to compare? For example:
            </span>
            <div className="flex w-full flex-wrap items-start gap-2">
              <Badge variant="neutral" icon={null}>Protected areas</Badge>
              <Badge variant="neutral" icon={null}>Community-led</Badge>
              <Badge variant="neutral" icon={null}>Economic incentives</Badge>
              <Badge variant="neutral" icon={null}>Regulatory</Badge>
            </div>
          </Message>
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Compare community-led, economic incentives, and regulatory approaches
            </span>
          </Message>
          <Message from={JANE}>
            <span className="text-body font-body text-default-font">
              Perfect! What criteria should I use for comparison? (e.g., cost, effectiveness, timeframe, scalability)
            </span>
          </Message>
        </Conversation>
      </div>

      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 3: Extended Conversation with Context
        </span>
        <Conversation
          initiator={USER}
          recipient={NABU}
          mode="chat"
                    onSend={noop}
          onCancel={noop}
        >
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Summarize the key findings from my research papers
            </span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              I can help with that! I see you have several documents in your project. Which papers would you like me to focus on?
            </span>
            <div className="flex w-full flex-col items-start gap-2 rounded-md bg-neutral-50 px-3 py-2">
              <div className="flex w-full items-center gap-2">
                <FeatherFile className="text-caption font-caption text-brand-600" />
                <span className="text-caption font-caption text-default-font">Amazon Rainforest Case Study</span>
              </div>
              <div className="flex w-full items-center gap-2">
                <FeatherFile className="text-caption font-caption text-brand-600" />
                <span className="text-caption font-caption text-default-font">Species Survey Data</span>
              </div>
              <div className="flex w-full items-center gap-2">
                <FeatherFile className="text-caption font-caption text-brand-600" />
                <span className="text-caption font-caption text-default-font">Literature Review Notes</span>
              </div>
            </div>
          </Message>
          <Message from={USER}>
            <span className="text-body font-body text-default-font">All three, please</span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              Great! A few quick questions to tailor the summary:
            </span>
            <div className="flex w-full flex-col items-start gap-2 pl-3">
              <div className="flex w-full items-start gap-2">
                <span className="text-body font-body text-default-font">1.</span>
                <span className="text-body font-body text-default-font">
                  How detailed should the summary be? (Brief overview or in-depth analysis)
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <span className="text-body font-body text-default-font">2.</span>
                <span className="text-body font-body text-default-font">
                  Should I organize by theme or by document?
                </span>
              </div>
              <div className="flex w-full items-start gap-2">
                <span className="text-body font-body text-default-font">3.</span>
                <span className="text-body font-body text-default-font">
                  Any specific aspects you want highlighted? (methodology, results, implications)
                </span>
              </div>
            </div>
          </Message>
        </Conversation>
      </div>

      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 4: Quick Back-and-Forth
        </span>
        <Conversation
          initiator={USER}
          recipient={NABU}
          mode="chat"
                    onSend={noop}
          onCancel={noop}
        >
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Make this paragraph more concise
            </span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              Which paragraph would you like me to work on?
            </span>
          </Message>
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              The one about funding mechanisms
            </span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              Got it! How much shorter - cut by half or just trim unnecessary words?
            </span>
          </Message>
        </Conversation>
      </div>

      <div className="flex w-full flex-col items-start gap-2">
        <span className="text-heading-3 font-heading-3 text-default-font">
          Example 5: Task Execution with Subtasks
        </span>
        <Conversation initiator={USER} recipient={NABU} mode="progress" onFollowUp={noop} onCancel={noop}>
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Create a comprehensive analysis of biodiversity trends
            </span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              Which regions should I analyze?
            </span>
          </Message>
          <Message from={USER}>
            <span className="text-body font-body text-default-font">
              Southeast Asia and Amazon Basin
            </span>
          </Message>
          <Message from={NABU}>
            <span className="text-body font-body text-default-font">
              Perfect! Starting the analysis now.
            </span>
          </Message>
          <TaskProgress title="Creating comprehensive analysis" tasks={analysisExampleTasks} />
        </Conversation>
      </div>
    </div>
  );
}

export default NabuDocuments2;
