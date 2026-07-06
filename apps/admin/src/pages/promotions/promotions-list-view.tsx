import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@components/empty-state";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

const TYPE_LABELS: Record<string, string> = {
  percentage_discount: "Descuento %",
  special_price: "Precio especial",
  daily_menu: "Menú del día",
  happy_hour: "Happy hour",
  two_for_one: "2x1",
};

const STATUS_LABELS: Record<string, string> = {
  active: "activa",
  inactive: "inactiva",
  expired: "expirada",
};

export function PromotionsListView() {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <EmptyState title="Sin sucursal" description="Crea una sucursal para gestionar promociones." />
      </div>
    );
  }

  return <PromotionsListContent branchId={branch.id} />;
}

function PromotionsListContent({ branchId }: { branchId: string }) {
  const { data: promotions } = useSuspenseQuery(trpc.admin.promotions.list.queryOptions({ branchId }));

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Promociones</div>
        <h2>Promociones</h2>
        <p>Descuentos y precios especiales aplicados a la carta de esta sucursal.</p>
      </header>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-kicker">Activas y programadas ({promotions.length})</div>
          <Link className="admin-link" to="/promotions/new">
            + Nueva promoción
          </Link>
        </div>
        {promotions.length === 0 ? (
          <p className="admin-copy">Aún no hay promociones.</p>
        ) : (
          <ul className="admin-list">
            {promotions.map((promotion) => (
              <li className="admin-list-item" key={promotion.id}>
                <Link
                  className="admin-link admin-list-label"
                  params={{ promotionId: promotion.id }}
                  to="/promotions/$promotionId"
                >
                  {promotion.name}
                </Link>
                <span className="admin-list-meta">
                  {TYPE_LABELS[promotion.type] ?? promotion.type} ·{" "}
                  {STATUS_LABELS[promotion.status] ?? promotion.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
