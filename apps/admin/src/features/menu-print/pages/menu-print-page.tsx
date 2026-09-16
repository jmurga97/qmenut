import { Button } from "@jmurga97/components";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { useQuery } from "@tanstack/react-query";

import { trpc } from "~/lib/trpc";
import { getThemeQueryOptions } from "~/shared/api";

import { MenuPrintEditor } from "../components/menu-print-editor";

export function MenuPrintPage({ branchId, host }: { branchId: string; host: string }) {
  const menu = useQuery(trpc.menu.publicData.queryOptions({ host }));
  const theme = useQuery(getThemeQueryOptions({ branchId, trpc }));
  if (menu.isError || theme.isError)
    return (
      <section className="admin-card" role="status">
        <p>No se pudo cargar la carta o el tema de la sucursal.</p>
        <Button
          onClick={() => {
            void menu.refetch();
            void theme.refetch();
          }}
          variant="secondary"
        >
          Reintentar
        </Button>
      </section>
    );
  if (menu.isPending || theme.isPending) return <p role="status">Cargando la carta y la identidad de la sucursal…</p>;
  if (!menu.data || !menu.data.categories.some((category) => category.dishes.length > 0))
    return (
      <section className="admin-card" role="status">
        <h2>Tu carta todavía está vacía</h2>
        <p>Añade categorías y platos activos al menú de esta sucursal para preparar su carta.</p>
      </section>
    );
  if (menu.data.branch.id !== branchId)
    return <p role="alert">El dominio no corresponde a la sucursal seleccionada.</p>;
  return <MenuPrintEditor data={menu.data} theme={resolveTenantThemeConfig(theme.data)} host={host} />;
}
