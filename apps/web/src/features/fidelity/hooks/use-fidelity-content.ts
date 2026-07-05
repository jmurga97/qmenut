import { useMemo } from "react";

import { MOCK_FIDELITY_CONTENT } from "~/features/fidelity/mock/mock-fidelity-content";

export function useFidelityContent() {
  return useMemo(() => MOCK_FIDELITY_CONTENT, []);
}
