import { Button } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";

import { signOut } from "~/lib/auth-client";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { useBranchStore } from "~/shared/stores/branch-store";

import { getListRestaurantsQueryOptions } from "../api";
import { useSelectRestaurant } from "../hooks/use-select-restaurant";

import type { RestaurantRoleCode } from "@qmenut/permissions";

const ROLE_LABELS: Record<RestaurantRoleCode, string> = {
  owner: i18n.t("auth___Propietario"),
  admin: i18n.t("auth___Administrador"),
  staff: i18n.t("auth___Equipo"),
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
      <section aria-labelledby={"select-restaurant-title"} className="admin-login-panel">
        <div className={"admin-page-header admin-login-header"}>
          <h1 id={"select-restaurant-title"}>{i18n.t("auth___Elige un restaurante")}</h1>
          <p>
            {restaurants.length > 0
              ? i18n.t("auth___Tu cuenta tiene acceso a varios restaurantes. Selecciona con cuál quieres trabajar.")
              : i18n.t(
                  "auth___Tu cuenta no tiene acceso a ningún restaurante. Contacta con soporte para configurarlo.",
                )}
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
                type={"button"}
              >
                <span className="admin-select-restaurant-name">{restaurant.name}</span>
                <span className="admin-select-restaurant-role">{ROLE_LABELS[restaurant.roleCode]}</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="admin-select-restaurant-footer">
          <Button
            disabled={select.isPending || signOutMutation.isPending || undefined}
            onClick={() => signOutMutation.mutate()}
            variant={"secondary"}
          >
            {signOutMutation.isPending ? i18n.t("auth___Cerrando sesión…") : i18n.t("auth___Cerrar sesión")}
          </Button>
        </div>
      </section>
    </main>
  );
}
