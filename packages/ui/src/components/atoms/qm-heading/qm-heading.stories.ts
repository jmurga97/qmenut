import { html } from "lit";

import { archetypeGrid } from "../../../../.storybook/all-archetypes";

import type { QmHeadingArgs } from "./index";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta<QmHeadingArgs> = {
  title: "Components/QmHeading",
  tags: ["autodocs"],
  render: (args) => html`
    <qm-heading text=${args.text} eyebrow=${args.eyebrow ?? undefined} ?divider=${args.divider}></qm-heading>
  `,
  argTypes: {
    text: { control: "text" },
    eyebrow: { control: "text" },
    divider: { control: "boolean" },
  },
  args: {
    text: "Casa Elvira",
    eyebrow: "Alta cocina",
    divider: true,
  },
};

export default meta;

type Story = StoryObj<QmHeadingArgs>;

export const Default: Story = {};
export const NoEyebrow: Story = { args: { eyebrow: undefined } };
export const NoDivider: Story = { args: { divider: false } };

export const AllArchetypes: Story = {
  render: (args) =>
    archetypeGrid(
      () =>
        html`<qm-heading text=${args.text} eyebrow=${args.eyebrow ?? undefined} ?divider=${args.divider}></qm-heading>`,
    ),
};
