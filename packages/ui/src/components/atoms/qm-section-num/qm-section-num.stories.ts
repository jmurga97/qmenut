import { html } from "lit";

import { archetypeGrid } from "../../../../.storybook/all-archetypes";

import type { QmSectionNumArgs } from "./index";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta<QmSectionNumArgs> = {
  title: "Components/QmSectionNum",
  tags: ["autodocs"],
  render: (args) => html`
    <qm-section-num num=${args.num} label=${args.label} count=${args.count ?? undefined}></qm-section-num>
  `,
  argTypes: {
    num: { control: "text" },
    label: { control: "text" },
    count: { control: "text" },
  },
  args: {
    num: "01",
    label: "Degustación",
    count: "7 pases",
  },
};

export default meta;

type Story = StoryObj<QmSectionNumArgs>;

export const Default: Story = {};
export const NoCount: Story = { args: { count: undefined } };

export const AllArchetypes: Story = {
  render: (args) =>
    archetypeGrid(
      () =>
        html`<qm-section-num num=${args.num} label=${args.label} count=${args.count ?? undefined}></qm-section-num>`,
    ),
};
