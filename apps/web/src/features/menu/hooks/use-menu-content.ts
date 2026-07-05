import { useMemo } from "react";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { mapMockMenuContent } from "~/features/menu/mappers/map-mock-menu-content";
import { MOCK_MENU_CONTENT } from "~/features/menu/mock/mock-menu-content";
import { useAppTrpc } from "~/shared/hooks/use-app-trpc";

export function useMenuContent() {
  const trpc = useAppTrpc();
  const publicMenuQueryOptions = getPublicMenuQueryOptions({ trpc });

  void publicMenuQueryOptions;

  return useMemo(() => mapMockMenuContent(MOCK_MENU_CONTENT), []);
}
