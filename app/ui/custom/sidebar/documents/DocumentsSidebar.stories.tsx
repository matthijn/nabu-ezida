import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentsSidebar } from "./DocumentsSidebar";
import type { Document } from "./DocumentsSidebar";

const sampleDocuments: Document[] = [
  {
    id: "1",
    title: "Habitat Destruction Framework",
    editedAt: "Edited 2 hours ago",
    tags: [{ label: "Framework", variant: "brand" }],
    pinned: true,
  },
  {
    id: "2",
    title: "Research Paper Draft",
    editedAt: "Edited 3 days ago",
    tags: [{ label: "Paper" }],
    pinned: true,
  },
  {
    id: "3",
    title: "Amazon Rainforest Case Study",
    editedAt: "Edited yesterday",
    tags: [{ label: "Corpus" }, { label: "Field Notes" }],
  },
  {
    id: "4",
    title: "Literature Review Notes",
    editedAt: "Edited 1 week ago",
    tags: [{ label: "Literature" }, { label: "Review" }],
  },
  {
    id: "5",
    title: "Species Survey Data",
    editedAt: "Edited 2 weeks ago",
    tags: [{ label: "Corpus" }],
  },
  {
    id: "6",
    title: "Methodology & Approach",
    editedAt: "Edited 3 weeks ago",
    tags: [{ label: "Framework" }],
  },
];

const meta: Meta<typeof DocumentsSidebar> = {
  title: "Custom/Sidebar/Documents/DocumentsSidebar",
  component: DocumentsSidebar,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div style={{ height: "100vh" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DocumentsSidebar>;

export const Default: Story = {
  args: {
    documents: sampleDocuments,
    selectedId: "1",
  },
};

export const Empty: Story = {
  args: {
    documents: [],
  },
};

export const NoPinned: Story = {
  args: {
    documents: sampleDocuments.map((d) => ({ ...d, pinned: false })),
    selectedId: "3",
  },
};

export const WithSearch: Story = {
  args: {
    documents: sampleDocuments,
    searchValue: "habitat",
    selectedId: "1",
  },
};
