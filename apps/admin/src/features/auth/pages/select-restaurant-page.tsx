import { Button } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { useBranchStore } from "~/app/store/branch-store";
import { signOut } from "~/lib/auth-client";
import { trpc } from "~/lib/trpc";
import { FormFeedback } from "~/shared/components/forms/form-feedback";

import { getListRestaurantsQueryOptions } from "../api";
import { useSelectRestaurant } from "../hooks/use-select-restaurant";

import type { RestaurantRoleCode } from "@qmenut/permissions";

const ROLE_LABELS: Record<RestaurantRoleCode, string> = {
  owner: "Propietario",
  admin: "Administrador",
  staff: "Equipo",
};

export function SelectRestaurantPage() {
  const select = useSelectRestaurant();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: restaurants } = useSuspenseQuery(getListRestaurantsQueryOptions({ trpc }));
  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      queryClient.clear();
      useBranchStore.getState().resetSelectedBranchId();
      await navigate({ to: "/login" });
      await router.invalidate();
    },
  });
  return (
    <main className="admin-login-shell">
      <section aria-labelledby="select-restaurant-title" className="admin-login-panel">
        <div className="admin-page-header admin-login-header">
          <h2 id="select-restaurant-title">Elige un restaurante</h2>
          <p>
            {restaurants.length > 0
              ? "Tu cuenta tiene acceso a varios restaurantes. Selecciona con cuál quieres trabajar."
              : "Tu cuenta no tiene acceso a ningún restaurante. Contacta con soporte para configurarlo."}
          </p>
        </div>
        {restaurants.length > 0 ? (
          <div className="admin-select-restaurant-list">
            {restaurants.map((restaurant) => (
              <button
                className="admin-select-restaurant-option"
                disabled={select.isPending}
                key={restaurant.restaurantId}
                onClick={() => select.mutate({ restaurantId: restaurant.restaurantId })}
                type="button"
              >
                <span className="admin-select-restaurant-name">{restaurant.name}</span>
                <span className="admin-select-restaurant-role">{ROLE_LABELS[restaurant.roleCode]}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="admin-select-restaurant-footer">
          <FormFeedback error={select.error ?? signOutMutation.error} />
          <Button
            disabled={select.isPending || signOutMutation.isPending || undefined}
            onClick={() => signOutMutation.mutate()}
            variant="secondary"
          >
            {signOutMutation.isPending ? "Cerrando sesión…" : "Cerrar sesión"}
          </Button>
        </div>
      </section>
    </main>
  );
}
