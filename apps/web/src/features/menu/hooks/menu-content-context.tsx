import { useRouterState } from "@tanstack/react-router";
import { createContext, useContext } from "react";

import { useMappedMenuContent } from "./use-menu-content";

import type { ReactNode } from "react";
import type { MenuContentViewModel } from "~/features/menu/types/menu-view-model";

const MenuContentContext = createContext<MenuContentViewModel | null>(null);

export function MenuContentProvider({ children }: { children: ReactNode }) {
  const isMenuRoute = useRouterState({
    select: (state) => state.matches.at(-1)?.routeId === "/{-$locale}/",
  });

  const content = useMappedMenuContent({ enabled: isMenuRoute });

  return <MenuContentContext.Provider value={content}>{children}</MenuContentContext.Provider>;
}

export function useMenuContent(): MenuContentViewModel | null {
  return useContext(MenuContentContext);
}
