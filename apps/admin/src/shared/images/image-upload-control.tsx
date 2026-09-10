import { Button } from "@jmurga97/components";

import { ImageFilePicker } from "./image-file-picker";

import type { ImageDraft } from "./image-draft";

const statusLabel = {
  idle: "",
  ready: "Pendiente de guardar",
  uploading: "Subiendo",
  optimizing: "Procesando imagen",
  succeeded: "Archivo recibido",
  failed: "Error en la imagen",
} as const;

interface ImageUploadControlProps {
  compact?: boolean;
  disabled?: boolean;
  draft: ImageDraft;
  label: string;
  logo?: boolean;
  onRemove: () => void;
  onSelect?: (file: File) => void;
}

export function ImageUploadControl({
  compact = false,
  disabled = false,
  draft,
  label,
  logo = false,
  onRemove,
  onSelect,
}: ImageUploadControlProps) {
  return (
    <div className={`admin-image-control${logo ? " admin-image-control--logo" : ""}`}>
      <div className="admin-image-control__header">
        <span className="admin-image-control__label">{label}</span>
        <span aria-live="polite" className={`admin-image-status admin-image-status--${draft.status}`}>
          {statusLabel[draft.status] || (draft.changed ? "Pendiente de guardar" : "")}
        </span>
      </div>
      <ImageFilePicker
        action={draft.previewUrl ? "Reemplazar" : "Seleccionar imagen"}
        actions={
          draft.previewUrl ? (
            <Button
              variant="secondary"
              aria-label={`Quitar: ${label}`}
              disabled={disabled}
              onClick={onRemove}
              type="button"
            >
              Quitar
            </Button>
          ) : null
        }
        compact={compact}
        disabled={disabled || !onSelect}
        error={draft.error}
        label={label}
        onSelect={(files) => {
          if (files[0]) onSelect?.(files[0]);
        }}
      >
        {draft.previewUrl ? (
          <div className="admin-image-preview">
            <img alt={label} draggable={false} src={draft.previewUrl} />
          </div>
        ) : null}
      </ImageFilePicker>
      {compact ? null : <small className="admin-image-help">Los cambios se aplican al guardar.</small>}
    </div>
  );
}
