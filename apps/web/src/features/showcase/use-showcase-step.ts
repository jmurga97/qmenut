import { createContext, useContext } from "react";

import type { ShowcaseStep } from "@qmenut/ui/theme/showcase";

export const ShowcaseContext = createContext<ShowcaseStep | null>(null);

export function useShowcaseStep(): ShowcaseStep | null {
  return useContext(ShowcaseContext);
}
