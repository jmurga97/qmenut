import { Switch } from "@ming/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import * as api from "~/features/dashboard/api";
import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { formatMoney } from "~/shared/services/money";

export function AvailabilityCard() {
  const branch = useSelectedBranch();
  if (!branch) return null;
  return <AvailabilityList branchId={branch.id} key={branch.id} />;
}

function AvailabilityList({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const categories = useSuspenseQuery(api.getMenuCategoriesQueryOptions({ branchId, trpc })).data;
  const dishes = useSuspenseQuery(api.getMenuDishesQueryOptions({ branchId, trpc })).data;
  const availability = useMutation(api.getDishAvailabilityMutationOptions({ branchId, queryClient, trpc }));
  const nameByCategory = new Map(categories.map((category) => [category.id, category.name]));
  const sortedDishes = dishes.toSorted((a, b) => Number(a.isActive) - Number(b.isActive));
  return (
    <div className="admin-dashboard-scroll">
      <FormFeedback error={availability.error} />
      <EntityListCard
        action={
          <Link className="admin-link" to="/menu">
            Gestionar menú →
          </Link>
        }
        count={dishes.length}
        emptyText="Añade platos a la carta para controlar su disponibilidad desde aquí."
        title="Disponibilidad de la carta"
      >
        {sortedDishes.map((dish) => (
          <li className="admin-list-item" key={dish.id}>
            <Link className="admin-link admin-list-label" params={{ dishId: dish.id }} to="/menu/dishes/$dishId">
              {dish.name}
            </Link>
            <div className="admin-toolbar-controls">
              <span className="admin-list-meta">
                {nameByCategory.get(dish.categoryId) ?? ""} · {formatMoney(dish.price)}
              </span>
              <Switch
                aria-label={`Disponibilidad de ${dish.name}`}
                checked={dish.isActive}
                disabled={availability.isPending && availability.variables?.dishId === dish.id}
                label={dish.isActive ? "Disponible" : "Oculto"}
                onCheckedChange={(checked) => availability.mutate({ branchId, dishId: dish.id, isActive: checked })}
              />
            </div>
          </li>
        ))}
      </EntityListCard>
    </div>
  );
}
