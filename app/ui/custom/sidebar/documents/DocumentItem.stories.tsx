import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocumentItem } from "./DocumentItem";

const meta: Meta<typeof DocumentItem> = {
  title: "Custom/Sidebar/Documents/DocumentItem",
  component: DocumentItem,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 280 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DocumentItem>;

export const Default: Story = {
  args: {
    title: "Research Paper Draft",
    editedAt: "Edited 3 days ago",
    tags: [{ label: "Paper" }],
  },
};

export const Selected: Story = {
  args: {
    title: "Habitat Destruction Framework",
    editedAt: "Edited 2 hours ago",
    tags: [{ label: "Framework", variant: "brand" }],
    selected: true,
  },
};

export const MultipleTags: Story = {
  args: {
    title: "Amazon Rainforest Case Study",
    editedAt: "Edited yesterday",
    tags: [
      { label: "Corpus" },
      { label: "Field Notes" },
    ],
  },
};

export const LongTitle: Story = {
  args: {
    title: "A Very Long Document Title That Might Need To Wrap To Multiple Lines",
    editedAt: "Edited 1 week ago",
    tags: [{ label: "Literature" }, { label: "Review" }],
  },
};
