export type FileOperation =
  | { phase: "preparing" | "saving" }
  | { phase: "uploading"; loadedBytes: number; totalBytes: number };

export function FileOperationProgress({ operation }: { operation: FileOperation }) {
  const percentage =
    operation.phase === "uploading"
      ? Math.min(100, Math.floor((operation.loadedBytes / Math.max(1, operation.totalBytes)) * 100))
      : undefined;
  const label = (() => {
    if (operation.phase === "preparing") return "Preparando subida…";
    if (operation.phase === "saving") return "Guardando datos…";
    if (percentage === 100) return "100 % transferido. Confirmando recepción…";
    return `Subiendo archivos… ${percentage} %`;
  })();
  return (
    <div className="admin-file-operation">
      <span className="admin-file-operation__label" role="status">
        {percentage === undefined ? <span className="admin-file-operation__loader" aria-hidden="true" /> : null}
        {label}
      </span>
      {percentage === undefined ? null : (
        <progress aria-label="Transferencia de archivos" max={100} value={percentage} />
      )}
      <small>Espera a que termine el guardado antes de salir.</small>
    </div>
  );
}
