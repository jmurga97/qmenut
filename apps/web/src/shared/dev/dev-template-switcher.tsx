import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useEffect } from "react";

import type { QmTemplateName } from "@qmenut/ui/theme/presets";

const TEMPLATE_ORDER: QmTemplateName[] = ["fine", "her", "fast", "cafe", "tapas"];

export function DevTemplateSwitcher() {
  const devTemplate = useRouteContext({ from: "/{-$locale}", select: (context) => context.devTemplate });
  const navigate = useNavigate();

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) {
        return;
      }

      const index = Number(event.key) - 1;

      if (!Number.isSafeInteger(index) || index < 0 || index >= TEMPLATE_ORDER.length) {
        return;
      }

      event.preventDefault();
      void navigate({
        to: ".",
        search: (prev) => ({ ...prev, template: TEMPLATE_ORDER[index] }),
        replace: true,
      });
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <aside className="dev-template-switcher" aria-label="Vista previa de plantilla">
      {devTemplate ?? "default"}
    </aside>
  );
}
