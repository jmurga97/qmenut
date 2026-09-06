import { useEffect, useState } from "react";

import type { MenuDishModalContent } from "./menu-dish-modal-content";
import type { MenuDishViewModel } from "~/features/menu/types/menu-view-model";

type DishModalContent = typeof MenuDishModalContent;

const modalModule: { promise?: Promise<DishModalContent> } = {};

async function importDishModal(): Promise<DishModalContent> {
  try {
    const { MenuDishModalContent } = await import("./menu-dish-modal-content");
    return MenuDishModalContent;
  } catch (error) {
    modalModule.promise = undefined;
    throw error;
  }
}

/** Downloads the dish sheet once, off the critical path, so opening a dish never waits on a request. */
function loadDishModal(): Promise<DishModalContent> {
  modalModule.promise ??= importDishModal();

  return modalModule.promise;
}

function scheduleIdle(callback: () => void): () => void {
  if (!("requestIdleCallback" in window)) {
    const timer = setTimeout(callback, 200);

    return () => clearTimeout(timer);
  }

  const handle = window.requestIdleCallback(callback, { timeout: 2000 });

  return () => window.cancelIdleCallback(handle);
}

interface MenuDishModalProps {
  dish: MenuDishViewModel | null;
  onClose: () => void;
  showDishPhoto: boolean;
}

export function MenuDishModal({ dish, onClose, showDishPhoto }: MenuDishModalProps) {
  const [Content, setContent] = useState<DishModalContent | null>(null);
  const isWaitingForOpen = dish !== null && Content === null;

  useEffect(() => {
    if (Content) return;

    let active = true;

    const load = async () => {
      try {
        const component = await loadDishModal();
        if (active) setContent(() => component);
      } catch {
        // A failed download retries the next time a dish is opened.
      }
    };

    // A tap that beats the idle warm-up starts the download right away.
    if (isWaitingForOpen) {
      void load();

      return () => {
        active = false;
      };
    }

    const cancelIdle = scheduleIdle(() => void load());

    return () => {
      active = false;
      cancelIdle();
    };
  }, [Content, isWaitingForOpen]);

  if (!dish || !Content) {
    return null;
  }

  return <Content dish={dish} showDishPhoto={showDishPhoto} onClose={onClose} />;
}
