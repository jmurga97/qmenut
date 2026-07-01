import { html } from "lit";

import { archetypeGrid } from "../../../../.storybook/all-archetypes";

import type { QmWordmarkArgs } from "./index";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta<QmWordmarkArgs> = {
  title: "Components/QmWordmark",
  tags: ["autodocs"],
  render: (args) => html`<qm-wordmark text=${args.text}></qm-wordmark>`,
  argTypes: {
    text: { control: "text" },
  },
  args: {
    text: "Casa Elvira",
  },
};

export default meta;

type Story = StoryObj<QmWordmarkArgs>;

export const Default: Story = {};

export const AllArchetypes: Story = {
  render: (args) => archetypeGrid(() => html`<qm-wordmark text=${args.text}></qm-wordmark>`),
};
