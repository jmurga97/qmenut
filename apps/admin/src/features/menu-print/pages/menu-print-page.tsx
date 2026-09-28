import { Button } from "@jmurga97/components";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { useQuery } from "@tanstack/react-query";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getThemeQueryOptions } from "~/shared/api";
import { CardSkeleton } from "~/shared/components/state/loading-state";

import { MenuPrintEditor } from "../components/menu-print-editor";

export function MenuPrintPage({ branchId, host }: { branchId: string; host: string }) {
  const menu = useQuery(trpc.menu.publicData.queryOptions({ host }));
  const theme = useQuery(getThemeQueryOptions({ branchId, trpc }));
  if (menu.isError || theme.isError)
    return (
      <section className="admin-card" role={"status"}>
        <p>{i18n.t("menuPrint___No se pudo cargar la carta o el tema de la sucursal.")}</p>
        <Button
          onClick={() => {
            void menu.refetch();
            void theme.refetch();
          }}
          variant={"secondary"}
        >
          {i18n.t("menuPrint___Reintentar")}
        </Button>
      </section>
    );
  if (menu.isPending || theme.isPending)
    return <CardSkeleton rows={6} title={i18n.t("menuPrint___Carta para imprimir")} />;
  if (!menu.data || !menu.data.categories.some((category) => category.dishes.length > 0))
    return (
      <section className="admin-card" role={"status"}>
        <h2>{i18n.t("menuPrint___Tu carta todavía está vacía")}</h2>
        <p>
          {i18n.t("menuPrint___Añade categorías y platos activos al menú de esta sucursal para preparar su carta.")}
        </p>
      </section>
    );
  if (menu.data.branch.id !== branchId)
    return <p role={"alert"}>{i18n.t("menuPrint___El dominio no corresponde a la sucursal seleccionada.")}</p>;
  return <MenuPrintEditor data={menu.data} theme={resolveTenantThemeConfig(theme.data)} host={host} />;
}
