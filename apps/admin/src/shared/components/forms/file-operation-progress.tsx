import { i18n } from "~/lib/i18n";

export type FileOperation =
  | { phase: "preparing" | "saving" }
  | { phase: "uploading"; loadedBytes: number; totalBytes: number };

export function FileOperationProgress({ operation }: { operation: FileOperation }) {
  const percentage =
    operation.phase === "uploading"
      ? Math.min(100, Math.floor((operation.loadedBytes / Math.max(1, operation.totalBytes)) * 100))
      : undefined;
  const label = (() => {
    if (operation.phase === "preparing") return i18n.t("shared___Preparando subida…");
    if (operation.phase === "saving") return i18n.t("shared___Guardando datos…");
    if (percentage === 100) return i18n.t("shared___100 % transferido. Confirmando recepción…");
    return i18n.t("shared___Subiendo archivos… {{percentage}} %", { percentage });
  })();
  return (
    <div className="admin-file-operation">
      <span className={"admin-file-operation__label"} role={"status"}>
        {percentage === undefined ? <span className={"admin-file-operation__loader"} aria-hidden={"true"} /> : null}
        {label}
      </span>
      {percentage === undefined ? null : (
        <progress aria-label={i18n.t("shared___Transferencia de archivos")} max={100} value={percentage} />
      )}
      <small>{i18n.t("shared___Espera a que termine el guardado antes de salir.")}</small>
    </div>
  );
}
