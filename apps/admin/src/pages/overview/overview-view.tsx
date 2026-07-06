import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "@lib/trpc";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  staff: "Equipo",
};

export function OverviewView() {
  const { data: tenant } = useSuspenseQuery(trpc.admin.tenant.me.queryOptions());

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Resumen</div>
        <h2>{tenant.restaurant.name}</h2>
        <p>
          Gestiona la carta, la información de la sucursal, las promociones y la suscripción de tu restaurante desde
          este panel.
        </p>
      </header>

      <div className="admin-overview-grid">
        <section className="admin-card" aria-label="Sucursales">
          <div className="admin-kicker">Sucursales</div>
          <ul className="admin-list">
            {tenant.branches.map((branch) => (
              <li className="admin-list-item" key={branch.id}>
                <span className="admin-list-label">{branch.name}</span>
                <span className="admin-list-meta">
                  {branch.customDomain ?? "sin dominio"} · {branch.planCode}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="admin-overview-secondary">
          <div className="admin-card">
            <div className="admin-kicker">Tu acceso</div>
            <p className="admin-copy">
              Rol: {ROLE_LABELS[tenant.roleCode] ?? tenant.roleCode} · Moneda: {tenant.restaurant.defaultCurrency} ·
              Idioma: {tenant.restaurant.defaultLanguageCode}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
