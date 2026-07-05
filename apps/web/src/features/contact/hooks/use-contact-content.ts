import { useMemo } from "react";

import { mapMockContactContent } from "~/features/contact/mappers/map-mock-contact-content";
import { MOCK_CONTACT_CONTENT } from "~/features/contact/mock/mock-contact-content";

export function useContactContent() {
  return useMemo(() => mapMockContactContent(MOCK_CONTACT_CONTENT), []);
}
