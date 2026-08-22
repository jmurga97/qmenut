import { useId, useRef } from "react";

import type { ImageDraft } from "./image-draft";

const statusLabel = {
  idle: "",
  ready: "Lista para guardar",
  uploading: "Subiendo",
  optimizing: "Optimizando",
  succeeded: "Imagen preparada",
  failed: "Error en la imagen",
} as const;

interface ImageUploadControlProps {
  disabled?: boolean;
  draft: ImageDraft;
  label: string;
  onRemove: () => void;
  onRetry: () => void;
  onSelect?: (file: File) => void;
}

export function ImageUploadControl({
  disabled = false,
  draft,
  label,
  onRemove,
  onRetry,
  onSelect,
}: ImageUploadControlProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = disabled || draft.status === "uploading" || draft.status === "optimizing";
  return (
    <div className="admin-image-control">
      <div className="admin-image-control__header">
        <label className="admin-image-control__label" htmlFor={inputId}>
          {label}
        </label>
        <span aria-live="polite" className={`admin-image-status admin-image-status--${draft.status}`}>
          {statusLabel[draft.status]}
        </span>
      </div>
      <button
        className="admin-image-preview"
        disabled={busy || !onSelect}
        onClick={() => onSelect && inputRef.current?.click()}
        type="button"
      >
        {draft.previewUrl ? (
          <img alt="Vista previa de la imagen seleccionada" src={draft.previewUrl} />
        ) : (
          <span>
            <b>Elegir imagen</b>
            JPEG, PNG o WebP · máximo 25 MiB
          </span>
        )}
      </button>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="admin-visually-hidden"
        disabled={busy || !onSelect}
        id={inputId}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) onSelect?.(file);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      <div className="admin-image-actions">
        {draft.previewUrl && onSelect ? (
          <button
            className="admin-image-action--replace"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            type="button"
          >
            Reemplazar
          </button>
        ) : null}
        {draft.previewUrl ? (
          <button className="admin-image-action--remove" disabled={busy} onClick={onRemove} type="button">
            Quitar
          </button>
        ) : null}
        {draft.status === "failed" && draft.file ? (
          <button className="admin-image-action--retry" disabled={busy} onClick={onRetry} type="button">
            Reintentar
          </button>
        ) : null}
      </div>
      {draft.error ? <small className="admin-image-error">{draft.error}</small> : null}
    </div>
  );
}
