import { Button } from "@jmurga97/components";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

import { getErrorMessage } from "~/lib/errors";
import { i18n } from "~/lib/i18n";

import type { ErrorComponentProps } from "@tanstack/react-router";

export function RouteErrorState({ error }: ErrorComponentProps) {
  const router = useRouter();
  const queryErrorReset = useQueryErrorResetBoundary();
  // Suspense queries that failed stay failed until the reset boundary lets them refetch on retry.
  useEffect(() => queryErrorReset.reset(), [queryErrorReset]);
  return (
    <div className={"admin-state-shell admin-state-error"}>
      <div className="admin-state-eyebrow">{i18n.t("shared___Error")}</div>
      <h1>{i18n.t("shared___No hemos podido cargar esta vista.")}</h1>
      <p>{getErrorMessage(error)}</p>
      <div className="admin-topbar-actions">
        <Button onClick={() => void router.invalidate()}>{i18n.t("shared___Reintentar")}</Button>
        <Link className="admin-link" to="/">
          {i18n.t("shared___Volver al resumen")}
        </Link>
      </div>
    </div>
  );
}
