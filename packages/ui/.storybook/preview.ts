import { render } from "lit";

import { ARCHETYPES, applyQmTheme, registerQmComponents } from "../src/index";

import type { QmArchetypeName } from "../src/index";
import type { Preview } from "@storybook/web-components-vite";

registerQmComponents();

const archetypeNames = Object.keys(ARCHETYPES) as QmArchetypeName[];

const preview: Preview = {
  globalTypes: {
    archetype: {
      name: "Archetype",
      description: "QMenut visual archetype",
      defaultValue: "fine",
      toolbar: {
        icon: "paintbrush",
        items: archetypeNames.map((name) => ({ value: name, title: ARCHETYPES[name].label })),
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (story, context) => {
      const archetype = context.globals.archetype as QmArchetypeName;
      const container = document.createElement("div");
      container.style.padding = "2rem";
      applyQmTheme(container, { archetype });
      render(story(), container);
      return container;
    },
  ],
};

export default preview;
