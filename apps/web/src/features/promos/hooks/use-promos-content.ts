import { useMemo } from "react";

import { mapMockPromosContent } from "~/features/promos/mappers/map-mock-promos-content";
import { MOCK_PROMOS_CONTENT } from "~/features/promos/mock/mock-promos-content";

export function usePromosContent() {
  return useMemo(() => mapMockPromosContent(MOCK_PROMOS_CONTENT), []);
}
