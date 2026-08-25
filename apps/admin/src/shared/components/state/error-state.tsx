import { Button } from "@ming/components";
import { Link } from "@tanstack/react-router";

import { getErrorMessage } from "~/lib/errors";

import type { ErrorComponentProps } from "@tanstack/react-router";

export function RouteErrorState({ error, reset }: ErrorComponentProps) {
  return (
    <div className="admin-state-shell admin-state-error">
      <div className="admin-state-eyebrow">Error</div>
      <h2>No hemos podido cargar esta vista.</h2>
      <p>{getErrorMessage(error)}</p>
      <div className="admin-topbar-actions">
        <Button onClick={reset}>Reintentar</Button>
        <Link className="admin-link" to="/">
          Volver al resumen
        </Link>
      </div>
    </div>
  );
}
