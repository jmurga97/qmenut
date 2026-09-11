import { useRouterState } from "@tanstack/react-router";

import { MenuContentContext } from "~/shared/public-menu/menu-content-context";

import { useMappedMenuContent } from "./use-menu-content";

import type { ReactNode } from "react";

export function MenuContentProvider({ children }: { children: ReactNode }) {
  const isMenuRoute = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId === "/{-$locale}/",
  });

  const content = useMappedMenuContent({ enabled: isMenuRoute });

  return <MenuContentContext.Provider value={content}>{children}</MenuContentContext.Provider>;
}
