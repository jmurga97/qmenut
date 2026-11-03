import { Button, InlineMessage, StatusText } from "@jmurga97/components";

import { errorMessage } from "~/lib/query-client";

import type { ReactNode } from "react";

export function PageHeader({ title, status, actions }: { title: string; status?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="ming-page-header">
      <div className="ming-page-header__title">
        <h1>{title}</h1>
        {status ? <div className="ming-cluster">{status}</div> : null}
      </div>
      {actions ? <div className="ming-page-header__actions">{actions}</div> : null}
    </header>
  );
}

/** Loading and error for a page whose header depends on its data. */
export function PageState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (!error) return <StatusText label="Cargando…" tone="info" />;

  return (
    <div className="ming-stack">
      <InlineMessage message={errorMessage(error)} title="No se pudo cargar" tone="error" />
      <div>
        <Button onClick={onRetry} variant="secondary">
          Reintentar
        </Button>
      </div>
    </div>
  );
}
