import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

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
const paths = {
  branchLogo: "/branch",
  branchPhoto: "/branch",
  categoryImage: "/menu/categories/$categoryId",
  dishImage: "/menu/dishes/$dishId",
} as const;

function summaryState({ failed, pending }: { failed: boolean; pending: boolean }) {
  if (failed) return { status: "failed", label: "Una imagen necesita atención" };
  if (pending) return { status: "optimizing", label: "Datos guardados. Estamos preparando las imágenes." };
  return { status: "succeeded", label: "Imágenes actualizadas" };
}

function assignmentLabel(row: Assignment) {
  if (row.status === "failed") return "Necesita atención";
  return row.status === "applied" ? "Imagen actualizada" : "Preparando imagen";
}

function ImageActivityRow({ row, retrying, onRetry }: { row: Assignment; retrying: boolean; onRetry: () => void }) {
  const isFailed = row.status === "failed";
  const preview = row.images[0]?.url;
  return (
    <li>
      {preview ? <img alt="" src={preview} /> : null}
      <div>
        <strong>{labels[row.purpose]}</strong>
        <small>{assignmentLabel(row)}</small>
        {row.error ? <small>{row.error}</small> : null}
      </div>
      {isFailed ? (
        <button type="button" disabled={retrying} onClick={onRetry}>
          Reintentar
        </button>
      ) : null}
      <Link to={paths[row.purpose]} params={{ dishId: row.entityId, categoryId: row.entityId }}>
        Abrir editor
      </Link>
    </li>
  );
}

export function ImageActivity({ branchId }: { branchId: string }) {
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
  const seen = useRef(new Set<string>());
  const retry = useMutation(trpc.admin.images.assignments.retry.mutationOptions());
  const [notice, setNotice] = useState<string>();
  const rows = query.data ?? [];
  useEffect(() => {
    const applied = (query.data ?? []).filter((row) => row.status === "applied" && !seen.current.has(row.revision));
    if (applied.length === 0) return;
    for (const row of applied) seen.current.add(row.revision);
    void queryClient.invalidateQueries({ queryKey: trpc.admin.menu.pathKey() });
    void queryClient.invalidateQueries({ queryKey: trpc.admin.branches.pathKey() });
  }, [query.data, queryClient]);

  if (rows.length === 0 && !query.error) return null;

  const retryRow = (row: Assignment) => {
    setNotice(undefined);
    retry.mutate(
      { branchId, id: row.id, revision: row.revision },
      {
        onSuccess: (result) => {
          if (result.needsFile)
            setNotice("Abre el editor y selecciona el archivo de nuevo. Los demás cambios están guardados.");
          void query.refetch();
        },
        onError: () => setNotice("No se pudo reintentar. Abre el editor para seleccionar otra imagen."),
      },
    );
  };
  const summary = query.error
    ? { status: "failed", label: "No se pudo consultar el estado de las imágenes" }
    : summaryState({
        failed: rows.some((row) => row.status === "failed"),
        pending: rows.some((row) => row.status === "pending"),
      });
  return (
    <aside className="admin-image-activity" aria-label="Estado de las imágenes">
      <details>
        <summary className={`admin-image-status admin-image-status--${summary.status}`}>
          <span aria-hidden="true" className="admin-image-status__dot" />
          <span role="status">{summary.label}</span>
          <span className="admin-image-activity__detail">Ver detalles</span>
        </summary>
        {rows.length > 0 ? (
          <p>
            {rows.some((row) => row.status === "pending")
              ? "Las imágenes se publicarán automáticamente. Puedes cerrar esta pestaña."
              : "Los datos están guardados. Puedes cerrar esta pestaña."}
          </p>
        ) : null}
        {query.error ? <p role="alert">No se pudo consultar el estado. Volveremos a intentarlo.</p> : null}
        <ul>
          {rows.map((row) => (
            <ImageActivityRow key={row.id} row={row} retrying={retry.isPending} onRetry={() => retryRow(row)} />
          ))}
        </ul>
        {notice ? <p role="status">{notice}</p> : null}
      </details>
    </aside>
  );
}
