import { Badge, Button } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";

import { imageStatusLabel, imageStatusTone } from "./image-draft";
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
  const status = imageStatusLabel[draft.status] || (draft.changed ? i18n.t("images___Pendiente de guardar") : "");
  return (
    <div className={`admin-image-control${logo ? " admin-image-control--logo" : ""}`}>
      <div className={"admin-image-control__header"}>
        <span className={"admin-image-control__label"}>{label}</span>
        {status ? (
          <Badge
            aria-live={"polite"}
            tone={draft.changed && draft.status === "idle" ? "warning" : imageStatusTone[draft.status]}
          >
            {status}
          </Badge>
        ) : null}
      </div>
      <ImageFilePicker
        action={draft.previewUrl ? i18n.t("images___Reemplazar") : i18n.t("images___Seleccionar imagen")}
        actions={
          draft.previewUrl ? (
            <Button
              variant={"secondary"}
              aria-label={i18n.t("images___Quitar: {{label}}", { label })}
              disabled={disabled}
              onClick={onRemove}
              type={"button"}
            >
              {i18n.t("images___Quitar")}
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
      <small className="admin-image-help">{i18n.t("images___Los cambios se aplican al guardar.")}</small>
    </div>
  );
}
