import { useSuspenseQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { PageHeader } from "~/shared/components/page-header";

const ROLES = { owner: "Propietario", admin: "Administrador", staff: "Equipo" } as const;
export function OverviewPage() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const role = ROLES[tenant.roleCode];
  const { defaultCurrency: currency, defaultLanguageCode: language } = tenant.restaurant;
  return (
    <div className="admin-page">
      <PageHeader kicker="Resumen" title={tenant.restaurant.name} />
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
        <section className="admin-overview-secondary admin-card">
          <p className="admin-copy">
            Rol: {role} · Moneda: {currency} · Idioma: {language}
          </p>
        </section>
      </div>
    </div>
  );
}
