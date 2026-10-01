import { ConfirmAction } from "@jmurga97/components";
import { Outlet, useBlocker, useLocation } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { i18n } from "~/lib/i18n";
import { isEditorDirty } from "~/shared/stores/shell-store";

import type { ReactNode } from "react";

/** List on the start side, the child route's editor beside it. Guards unsaved edits when the editor would change. */
export function MasterDetail({ list }: { list: ReactNode }) {
  const blocker = useBlocker({ enableBeforeUnload: isEditorDirty, shouldBlockFn: isEditorDirty, withResolver: true });
  const paneRef = useRef<HTMLElement>(null);
  const pathname = useLocation({ select: (location) => location.pathname });
  // The editor swaps in place, so the page scroll would otherwise stay wherever the previous record left it.
  useEffect(() => {
    paneRef.current?.closest(".admin-main-slot")?.scrollTo({ top: 0 });
  }, [pathname]);
  return (
    <div className="admin-master-detail">
      <div className="admin-master-list">{list}</div>
      <section className="admin-detail-pane" ref={paneRef}>
        <Outlet />
      </section>
      <ConfirmAction
        cancelLabel={i18n.t("shell___Cancelar")}
        confirmLabel={i18n.t("shell___Descartar cambios")}
        message={i18n.t("shared___Los cambios sin guardar se perderán.")}
        onConfirm={() => blocker.proceed?.()}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        open={blocker.status === "blocked"}
        title={i18n.t("shell___¿Descartar cambios?")}
      />
    </div>
  );
}

/** Index route of a MasterDetail: nothing selected yet. On narrow screens its presence shows the list instead. */
export function DetailEmpty({ text }: { text: string }) {
  return (
    <div className="admin-card admin-detail-empty">
      <p className="admin-copy">{text}</p>
    </div>
  );
}
