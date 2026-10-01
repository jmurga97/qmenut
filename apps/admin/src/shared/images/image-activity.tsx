import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getMenuDishesQueryOptions } from "~/shared/api";

import type { ImagePurpose } from "./image-draft";
import type { RouterOutputs } from "~/lib/trpc";

type Assignment = RouterOutputs["admin"]["images"]["assignments"]["list"][number];
const labels: Record<ImagePurpose, string> = {
  branchLogo: i18n.t("images___Logo de la sucursal"),
  branchPhoto: i18n.t("images___Galería de la sucursal"),
  categoryImage: i18n.t("images___Imagen de categoría"),
  dishImage: i18n.t("images___Imagen del plato"),
};

/**
 * Sin UI propia: refleja el estado del procesado de imágenes en toasts de sonner.
 * El id del toast es el de la fila, así que el polling lo reconstruye tras recargar la página.
 */
export function ImageActivityToasts({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const query = useQuery(
    trpc.admin.images.assignments.list.queryOptions(
      { branchId },
      {
        refetchInterval: (state) => ((state.state.data?.length ?? 0) > 0 || state.state.error ? 5000 : 30_000),
        refetchOnWindowFocus: true,
      },
    ),
  );
  const dishes = useQuery({
    ...getMenuDishesQueryOptions({ branchId, trpc }),
    enabled: query.data?.some((row) => row.purpose === "dishImage"),
  });
  const retry = useMutation(trpc.admin.images.assignments.retry.mutationOptions());
  const retryRow = (row: Assignment) => {
    retry.mutate(
      { branchId, id: row.id, revision: row.revision },
      {
        onSuccess: (result) => {
          if (result.needsFile) {
            toast.warning(i18n.t("images___Vuelve a seleccionar el archivo. Los demás cambios están guardados."));
          } else {
            toast.success(i18n.t("images___Reintento de imagen iniciado."));
          }
          void query.refetch();
        },
      },
    );
  };
  const retryRowRef = useRef(retryRow);
  useEffect(() => {
    retryRowRef.current = retryRow;
  });

  const shown = useRef(new Map<string, string>());
  useEffect(() => {
    const shownMap = shown.current;
    return () => {
      for (const id of shownMap.keys()) toast.dismiss(id);
      shownMap.clear();
    };
  }, [branchId]);

  useEffect(() => {
    const rows = query.data ?? [];
    const dishNames = new Map(dishes.data?.map((dish) => [dish.id, dish.name]));
    let applied = false;
    for (const row of rows) {
      const dishName = row.purpose === "dishImage" ? dishNames.get(row.entityId) : undefined;
      const label = dishName ? i18n.t("images___Imagen del plato ({{name}})", { name: dishName }) : labels[row.purpose];
      const key = `${row.status}:${label}`;
      if (shown.current.get(row.id) === key) continue;
      shown.current.set(row.id, key);
      switch (row.status) {
        case "pending": {
          toast.loading(i18n.t("images___{{label}}: preparando…", { label }), {
            duration: Infinity,
            id: row.id,
          });
          break;
        }
        case "applied": {
          applied = true;
          toast.success(i18n.t("images___{{label}} actualizada", { label }), {
            closeButton: true,
            duration: 6000,
            id: row.id,
          });
          break;
        }
        case "superseded": {
          toast.dismiss(row.id);
          break;
        }
        case "failed": {
          toast.error(row.error ?? i18n.t("images___{{label}}: la imagen necesita atención", { label }), {
            action: { label: i18n.t("images___Reintentar"), onClick: () => retryRowRef.current(row) },
            closeButton: true,
            duration: Infinity,
            id: row.id,
          });
          break;
        }
      }
    }
    const live = new Set(rows.map((row) => row.id));
    for (const id of shown.current.keys()) {
      if (!live.has(id)) {
        toast.dismiss(id);
        shown.current.delete(id);
      }
    }
    if (!applied) return;
    void queryClient.invalidateQueries({ queryKey: trpc.admin.menu.pathKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.admin.branches.pathKey() });
  }, [query.data, dishes.data, queryClient]);

  return null;
}
