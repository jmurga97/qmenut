import { Switch } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import * as api from "~/app/dashboard/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { formatMoney } from "~/shared/services/money";

export function AvailabilityCard() {
  const branch = useSelectedBranch();
  if (!branch) return null;
  return <AvailabilityList branchId={branch.id} key={branch.id} />;
}

function AvailabilityList({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const tenant = useSuspenseQuery(getTenantQueryOptions({ trpc })).data;
  const categories = useSuspenseQuery(api.getMenuCategoriesQueryOptions({ branchId, trpc })).data;
  const dishes = useSuspenseQuery(api.getMenuDishesQueryOptions({ branchId, trpc })).data;
  const availability = useMutation(api.getDishAvailabilityMutationOptions({ branchId, queryClient, trpc }));
  const nameByCategory = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );
  const sortedDishes = useMemo(() => dishes.toSorted((a, b) => Number(a.isActive) - Number(b.isActive)), [dishes]);
  return (
    <div className="admin-dashboard-scroll">
      <EntityListCard
        action={
          <Link className="admin-link" to={"/menu"}>
            {i18n.t("dashboard___Gestionar menú →")}
          </Link>
        }
        count={dishes.length}
        emptyText={i18n.t("dashboard___Añade platos a la carta para controlar su disponibilidad desde aquí.")}
        title={i18n.t("dashboard___Disponibilidad de la carta")}
      >
        {sortedDishes.map((dish) => (
          <li className="admin-list-item" key={dish.id}>
            <div className="admin-list-text">
              <Link className={"admin-link admin-list-label"} params={{ dishId: dish.id }} to={"/menu/dishes/$dishId"}>
                {dish.name}
              </Link>
              <span className="admin-list-meta">
                {nameByCategory.get(dish.categoryId) ?? ""} ·{" "}
                {formatMoney(dish.price, tenant.restaurant.sourceCurrency)}
              </span>
            </div>
            <Switch
              aria-label={i18n.t("dashboard___Disponibilidad de {{name}}", { name: dish.name })}
              checked={dish.isActive}
              label={dish.isActive ? i18n.t("dashboard___Disponible") : i18n.t("dashboard___Oculto")}
              onCheckedChange={(checked) => availability.mutate({ branchId, dishId: dish.id, isActive: checked })}
            />
          </li>
        ))}
      </EntityListCard>
    </div>
  );
}
