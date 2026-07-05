import type { MockPromosContent } from "~/features/promos/mock/mock-promos-content";
import type { PromosContentViewModel } from "~/features/promos/types/promos-view-model";

export function mapMockPromosContent(content: MockPromosContent): PromosContentViewModel {
  return {
    emptyLabel: content.emptyLabel,
    promos: content.promos,
    subtitle: content.subtitle,
    title: content.title,
  };
}
