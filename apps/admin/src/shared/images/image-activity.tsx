import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { trpc } from "~/lib/trpc";

import type { ImagePurpose } from "./image-draft";
import type { RouterOutputs } from "~/lib/trpc";

type Assignment = RouterOutputs["admin"]["images"]["assignments"]["list"][number];
const labels: Record<ImagePurpose, string> = {
  branchLogo: "Logo de la sucursal",
  branchPhoto: "Galería de la sucursal",
  categoryImage: "Imagen de categoría",
  dishImage: "Imagen del plato",
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
  const retry = useMutation(trpc.admin.images.assignments.retry.mutationOptions());
  const retryRow = (row: Assignment) => {
    retry.mutate(
      { branchId, id: row.id, revision: row.revision },
      {
        onSuccess: (result) => {
          if (result.needsFile) {
            toast.warning("Vuelve a seleccionar el archivo. Los demás cambios están guardados.");
          } else {
            toast.success("Reintento de imagen iniciado.");
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

  const shown = useRef(new Map<string, Assignment["status"]>());
  useEffect(() => {
    const shownMap = shown.current;
    return () => {
      for (const id of shownMap.keys()) toast.dismiss(id);
      shownMap.clear();
    };
  }, [branchId]);

  useEffect(() => {
    const rows = query.data ?? [];
    let applied = false;
    for (const row of rows) {
      if (shown.current.get(row.id) === row.status) continue;
      shown.current.set(row.id, row.status);
      switch (row.status) {
        case "pending": {
          toast.loading(`${labels[row.purpose]}: preparando…`, { duration: Infinity, id: row.id });
          break;
        }
        case "applied": {
          applied = true;
          toast.success(`${labels[row.purpose]} actualizada`, { closeButton: true, duration: 6000, id: row.id });
          break;
        }
        case "superseded": {
          toast.dismiss(row.id);
          break;
        }
        case "failed": {
          toast.error(row.error ?? `${labels[row.purpose]}: la imagen necesita atención`, {
            action: { label: "Reintentar", onClick: () => retryRowRef.current(row) },
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
  }, [query.data, queryClient]);

  return null;
}
