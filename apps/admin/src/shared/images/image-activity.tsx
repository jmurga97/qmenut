import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

import { trpc } from "~/lib/trpc";

import { releaseImageTransfer, startImageTransfers, useImageTransfers } from "./image-transfers";

import type { ImagePurpose } from "./image-draft";
import type { ImageTransfer } from "./image-transfers";
import type { AppRouter } from "@qmenut/api/router";
import type { inferRouterOutputs } from "@trpc/server";

type Assignment = inferRouterOutputs<AppRouter>["admin"]["images"]["assignments"]["list"][number];
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

function summaryState({ failed, uploading, pending }: { failed: boolean; uploading: boolean; pending: boolean }) {
  if (failed) return { status: "failed", label: "Una imagen necesita atención" };
  if (uploading) return { status: "optimizing", label: "Subiendo imágenes" };
  if (pending) return { status: "optimizing", label: "Preparando imágenes" };
  return { status: "succeeded", label: "Imágenes actualizadas" };
}

function assignmentLabel(row: Assignment, transfers: ImageTransfer[]) {
  if (row.status === "failed" || transfers.some((task) => task.status === "failed")) return "Necesita atención";
  if (transfers.some((task) => task.status === "uploading")) return "Subiendo imagen";
  return row.status === "applied" ? "Imagen actualizada" : "Preparando imagen";
}

function ImageActivityRow({
  row,
  transfers,
  retrying,
  onRetry,
}: {
  row: Assignment;
  transfers: ImageTransfer[];
  retrying: boolean;
  onRetry: () => void;
}) {
  const isFailed = row.status === "failed" || transfers.some((task) => task.status === "failed");
  const preview = transfers[0]?.previewUrl ?? row.images[0]?.url;
  return (
    <li>
      {preview ? <img alt="" src={preview} /> : null}
      <div>
        <strong>{labels[row.purpose]}</strong>
        <small>{assignmentLabel(row, transfers)}</small>
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

function preventInterruptedUpload(event: BeforeUnloadEvent) {
  const tasks = Object.values(useImageTransfers.getState().transfers);
  if (tasks.every((task) => !task.started || !["ready", "uploading", "failed"].includes(task.status))) return;
  event.preventDefault();
}

export function ImageActivity({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const transfers = useImageTransfers((state) => state.transfers);
  const active = Object.values(transfers).filter((task) => task.input.branchId === branchId && task.started);
  const query = useQuery(
    trpc.admin.images.assignments.list.queryOptions(
      { branchId },
      {
        refetchInterval: (state) => (active.length > 0 || (state.state.data?.length ?? 0) > 0 ? 2000 : false),
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

  useEffect(() => {
    if (!query.data) return;
    const pendingIds = new Set(
      query.data.flatMap((row) => row.images.flatMap((image) => (image.uploadId ? [image.uploadId] : []))),
    );
    const completed = Object.values(useImageTransfers.getState().transfers).filter(
      (task) => task.input.branchId === branchId && task.status === "optimizing" && !pendingIds.has(task.uploadId),
    );
    for (const task of completed) releaseImageTransfer(task.uploadId);
  }, [query.data, branchId]);

  useEffect(() => {
    window.addEventListener("beforeunload", preventInterruptedUpload);
    return () => window.removeEventListener("beforeunload", preventInterruptedUpload);
  }, []);

  const retryRow = (row: Assignment) => {
    setNotice(undefined);
    const failed = row.images.flatMap((image) => {
      const task = image.uploadId ? transfers[image.uploadId] : undefined;
      return task?.status === "failed" ? [task.uploadId] : [];
    });
    if (failed.length > 0) {
      startImageTransfers(failed);
      return;
    }
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
  if (rows.length === 0 && active.length === 0) return null;
  const uploading = active.some((task) => task.status === "uploading" || task.status === "ready");
  const summary = summaryState({
    uploading,
    failed: rows.some((row) => row.status === "failed") || active.some((task) => task.status === "failed"),
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
        <p>
          Datos guardados.{" "}
          {uploading
            ? "Mantén esta pestaña abierta mientras se transfieren los archivos. Puedes seguir trabajando."
            : "La preparación continúa aunque cierres esta pestaña."}
        </p>
        {query.error ? <p role="alert">No se pudo consultar el estado. Volveremos a intentarlo.</p> : null}
        <ul>
          {rows.map((row) => (
            <ImageActivityRow
              key={row.id}
              row={row}
              transfers={row.images.flatMap((image) =>
                image.uploadId && transfers[image.uploadId] ? [transfers[image.uploadId]] : [],
              )}
              retrying={retry.isPending}
              onRetry={() => retryRow(row)}
            />
          ))}
        </ul>
        {notice ? <p role="status">{notice}</p> : null}
      </details>
    </aside>
  );
}
