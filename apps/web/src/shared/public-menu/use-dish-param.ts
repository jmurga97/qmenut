import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import type { MenuDishViewModel } from "~/shared/public-menu/menu-view-model";

/**
 * The open dish lives in `?plato=<id>`, so the phone's back gesture closes the sheet and a dish can be shared.
 * `dishes` is null while the content loads, so an unknown id is only dropped once there is something to search.
 */
export function useDishParam(dishes: MenuDishViewModel[] | null) {
  const navigate = useNavigate();
  const router = useRouter();
  const dishId = useLocation({ select: (location) => location.search.plato });
  const dish = (dishId && dishes?.find((candidate) => candidate.rowKey === dishId)) || null;
  const openedHere = useRef(false);
  const trigger = useRef<HTMLElement | null>(null);
  // iOS swipe-back already slides the sheet away with its page snapshot: closing it again would play twice.
  const [instantClose, setInstantClose] = useState(false);

  useEffect(() => {
    function handlePopState(event: PopStateEvent) {
      setInstantClose("hasUAVisualTransition" in event && event.hasUAVisualTransition === true);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (dishId && dishes && !dish) {
      void navigate({ to: ".", search: ({ plato: _plato, ...rest }) => rest, replace: true, resetScroll: false });
    }
  }, [dish, dishId, dishes, navigate]);

  useEffect(() => {
    if (dish || !trigger.current) return;
    const element = trigger.current;
    trigger.current = null;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => element.focus({ preventScroll: true }));
    });
  }, [dish]);

  function open(next: MenuDishViewModel, from: HTMLElement) {
    trigger.current = from;
    openedHere.current = true;
    setInstantClose(false);
    void navigate({ to: ".", search: (prev) => ({ ...prev, plato: next.rowKey }), resetScroll: false });
  }

  function close() {
    setInstantClose(false);
    // Opened here: step back so the next back gesture leaves the menu instead of reopening the dish.
    if (openedHere.current) return router.history.back();
    void navigate({ to: ".", search: ({ plato: _plato, ...rest }) => rest, replace: true, resetScroll: false });
  }

  return { dish, instantClose, open, close };
}
