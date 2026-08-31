import { useState } from "react";

import { useMenuContent } from "~/features/menu/hooks/use-menu-content";

import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

interface UseMenuPageInput {
  showDishPhotos: boolean;
}

export function useMenuPage({ showDishPhotos }: UseMenuPageInput) {
  const content = useMenuContent();
  const [selectedDish, setSelectedDish] = useState<MenuDishViewModel | null>(null);

  return {
    content,
    selectedDish,
    setSelectedDish,
    showDishPhotos,
  };
}
