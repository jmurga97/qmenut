import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@components/empty-state";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(cents / 100);
}

export function MenuListView() {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <EmptyState title="Sin sucursal" description="Crea una sucursal para gestionar su carta." />
      </div>
    );
  }

  return <MenuListContent branchId={branch.id} planCurrency="EUR" />;
}

function MenuListContent({ branchId, planCurrency }: { branchId: string; planCurrency: string }) {
  const { data: categories } = useSuspenseQuery(trpc.admin.menu.categories.list.queryOptions({ branchId }));
  const { data: dishes } = useSuspenseQuery(trpc.admin.menu.dishes.list.queryOptions({ branchId }));

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Carta</div>
        <h2>Menú</h2>
        <p>Gestiona las categorías y los platos de esta sucursal.</p>
      </header>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-kicker">Categorías ({categories.length})</div>
          <Link className="admin-link" to="/menu/categories/new">
            + Nueva categoría
          </Link>
        </div>
        {categories.length === 0 ? (
          <p className="admin-copy">Aún no hay categorías.</p>
        ) : (
          <ul className="admin-list">
            {categories.map((category) => (
              <li className="admin-list-item" key={category.id}>
                <Link
                  className="admin-link admin-list-label"
                  params={{ categoryId: category.id }}
                  to="/menu/categories/$categoryId"
                >
                  {category.name}
                </Link>
                <span className="admin-list-meta">{category.isActive ? "activa" : "oculta"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="admin-card">
        <div className="admin-toolbar">
          <div className="admin-kicker">Platos ({dishes.length})</div>
          <Link className="admin-link" to="/menu/dishes/new">
            + Nuevo plato
          </Link>
        </div>
        {dishes.length === 0 ? (
          <p className="admin-copy">Aún no hay platos.</p>
        ) : (
          <ul className="admin-list">
            {dishes.map((dish) => (
              <li className="admin-list-item" key={dish.id}>
                <Link className="admin-link admin-list-label" params={{ dishId: dish.id }} to="/menu/dishes/$dishId">
                  {dish.name}
                </Link>
                <span className="admin-list-meta">
                  {formatPrice(dish.price, planCurrency)}
                  {dish.isActive ? "" : " · oculto"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
