import { Button } from "@jmurga97/components";

import { Icon } from "~/shared/components/icon";

import { imageStatusLabel } from "./image-draft";
import { ImageFilePicker } from "./image-file-picker";

import type { ImageDraft } from "./image-draft";

interface SingleImageUploadControlProps {
  disabled?: boolean;
  draft: ImageDraft;
  label: string;
  logo?: boolean;
  onRemove: () => void;
  onSelect?: (file: File) => void;
}

export function SingleImageUploadControl({
  disabled = false,
  draft,
  label,
  logo = false,
  onRemove,
  onSelect,
}: SingleImageUploadControlProps) {
  return (
    <div className={`admin-image-control${logo ? " admin-image-control--logo" : ""}`}>
      <div className="admin-image-control__header">
        <span className="admin-image-control__label">{label}</span>
        <span aria-live="polite" className={`admin-image-status admin-image-status--${draft.status}`}>
          {imageStatusLabel[draft.status] || (draft.changed ? "Pendiente de guardar" : "")}
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
              <Icon name="trash" /> Quitar
            </Button>
          ) : null
        }
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
      <small className="admin-image-help">Los cambios se aplican al guardar.</small>
    </div>
  );
}
