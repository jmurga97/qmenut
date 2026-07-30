import { useLoyaltyOperationsController } from "~/features/loyalty/hooks/use-loyalty-operations-controller";
import { formatCountdown, formatRelativeAge } from "~/features/loyalty/services";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export function LoyaltyOperationsPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para mostrar el código de fidelización." />;
  return <LoyaltyOperationsContent branchId={branch.id} branchName={branch.name} key={branch.id} />;
}
function LoyaltyOperationsContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  const loyalty = useLoyaltyOperationsController(branchId);
  const { pendingQuery, venueCodeQuery } = loyalty;
  return (
    <div className="admin-page admin-loyalty-page">
      <PageHeader kicker={`Operativa · ${branchName}`} title="Fidelización" />
      <section aria-labelledby="venue-code-title" className="loyalty-code-panel">
        <div className="loyalty-code-copy">
          <h3 id="venue-code-title">Código de esta sucursal</h3>
          <p>Cambia automáticamente. No hace falta tocar nada.</p>
        </div>
        {venueCodeQuery.isPending ? <div className="loyalty-code-placeholder">····</div> : null}
        {venueCodeQuery.isError ? (
          <mc-button onClick={() => void venueCodeQuery.refetch()} variant="secondary">
            Reintentar código
          </mc-button>
        ) : null}
        {venueCodeQuery.data ? (
          <div className="loyalty-code-live" aria-live="polite">
            <strong className="loyalty-code-digits">{venueCodeQuery.data.code}</strong>
            <div className="loyalty-countdown">
              <span>{formatCountdown(loyalty.remainingMs)}</span>
            </div>
          </div>
        ) : null}
      </section>
      <section className="admin-card loyalty-redemptions" aria-labelledby="pending-title">
        <div className="admin-toolbar">
          <h3 id="pending-title">Canjes pendientes ({pendingQuery.data?.length ?? 0})</h3>
          {pendingQuery.isFetching ? <span className="loyalty-live-label">Actualizando</span> : null}
        </div>
        {loyalty.rowError ? <mc-inline-message message={loyalty.rowError} tone="error" /> : null}
        {pendingQuery.isPending ? <p className="admin-copy">Buscando solicitudes…</p> : null}
        {pendingQuery.isError ? (
          <mc-button onClick={() => void pendingQuery.refetch()} variant="secondary">
            Reintentar lista
          </mc-button>
        ) : null}
        {pendingQuery.data?.length === 0 ? (
          <p className="admin-copy">No hay canjes esperando. Las nuevas solicitudes aparecerán aquí.</p>
        ) : null}
        {pendingQuery.data?.length ? (
          <ul className="loyalty-redemption-list">
            {pendingQuery.data.map((redemption) => (
              <li key={redemption.id} className="loyalty-redemption-row">
                <div className="loyalty-redemption-copy">
                  <strong>{redemption.rewardName}</strong>
                  <span>{redemption.email}</span>
                  <small>
                    {redemption.cost} sellos · {formatRelativeAge(redemption.createdAt, loyalty.now)}
                  </small>
                </div>
                <div className="loyalty-redemption-actions">
                  <mc-button
                    disabled={loyalty.actionBusy}
                    onClick={() => loyalty.validate(redemption)}
                    variant="primary"
                  >
                    ✓ Validar
                  </mc-button>
                  <mc-button
                    disabled={loyalty.actionBusy}
                    onClick={() => loyalty.reject(redemption.id)}
                    variant="secondary"
                  >
                    ✕ Rechazar
                  </mc-button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      {loyalty.undoNotice ? (
        <aside aria-live="polite" className="loyalty-toast">
          <p>
            <strong>Canje validado.</strong> {loyalty.undoNotice.error ?? loyalty.undoNotice.message}
          </p>
          <button disabled={loyalty.undoBusy} onClick={loyalty.undo} type="button">
            {loyalty.undoBusy ? "Deshaciendo…" : "Deshacer"}
          </button>
        </aside>
      ) : null}
    </div>
  );
}
