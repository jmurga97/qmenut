import { TEMPLATES } from "@qmenut/ui";
import { useState } from "react";

import { useMenuContent } from "~/features/menu/hooks/use-menu-content";

import type { QmTemplateName } from "@qmenut/ui";
import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

interface UseMenuPageInput {
  template: QmTemplateName;
}

export function useMenuPage({ template }: UseMenuPageInput) {
  const content = useMenuContent();
  const [selectedDish, setSelectedDish] = useState<MenuDishViewModel | null>(null);
  const photoMode = TEMPLATES[template].photoMode;

  return {
    content,
    selectedDish,
    setSelectedDish,
    showDishPhotos: photoMode !== "none",
    useHeroHeader: photoMode === "hero" || photoMode === "heroxl",
  };
}
