import { html } from "lit";

import { archetypeGrid } from "../../../.storybook/all-archetypes";

import type { QmButtonArgs } from "./index";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

const meta: Meta<QmButtonArgs> = {
  title: "Components/QmButton",
  tags: ["autodocs"],
  render: (args) => html`
    <qm-button
      variant=${args.variant}
      size=${args.size}
      type=${args.type}
      ?disabled=${args.disabled}
      aria-label=${args.ariaLabel ?? undefined}
    >
      Enviar →
    </qm-button>
  `,
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost"] },
    size: { control: "select", options: ["sm", "md"] },
    type: { control: "select", options: ["button", "submit", "reset"] },
    disabled: { control: "boolean" },
    ariaLabel: { control: "text" },
  },
  args: {
    variant: "primary",
    size: "md",
    type: "button",
    disabled: false,
  },
};

export default meta;

type Story = StoryObj<QmButtonArgs>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Disabled: Story = { args: { disabled: true } };

export const AllArchetypes: Story = {
  render: (args) =>
    archetypeGrid(
      () => html`
        <qm-button variant=${args.variant} size=${args.size} type=${args.type} ?disabled=${args.disabled}>
          Enviar →
        </qm-button>
      `,
    ),
};
