import { createContext, useContext } from "react";

import type { MenuContentViewModel } from "~/shared/public-menu/menu-view-model";

export const MenuContentContext = createContext<MenuContentViewModel | null>(null);

export function useMenuContent(): MenuContentViewModel | null {
  return useContext(MenuContentContext);
}
