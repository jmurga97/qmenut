import { Button } from "@jmurga97/components";
import { useId, useRef, useState } from "react";

import type { ReactNode } from "react";

interface ImageFilePickerProps {
  children?: ReactNode;
  compact?: boolean;
  disabled?: boolean;
  error?: string;
  label: string;
  multiple?: boolean;
  onSelect: (files: File[]) => void;
  action: string;
  actions?: ReactNode;
}

export function ImageFilePicker({
  children,
  compact = false,
  disabled = false,
  error,
  label,
  multiple = false,
  onSelect,
  action,
  actions,
}: ImageFilePickerProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [selectionError, setSelectionError] = useState<string>();
  const message = selectionError ?? error;
  const descriptionId = message ? `${id}-help ${id}-error` : `${id}-help`;
  const select = (files: File[]) => {
    if (files.length === 0 || disabled || input.current?.matches(":disabled") || input.current?.closest("[inert]"))
      return;
    if (!multiple && files.length > 1) {
      setSelectionError("Selecciona una sola imagen.");
      return;
    }
    setSelectionError(undefined);
    onSelect(files);
  };
  return (
    <div
      className={`admin-image-picker${over && !disabled ? " admin-image-picker--over" : ""}${compact ? " admin-image-picker--compact" : ""}`}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        if (disabled || input.current?.matches(":disabled") || input.current?.closest("[inert]")) return;
        event.dataTransfer.dropEffect = "copy";
        setOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.stopPropagation();
        setOver(false);
        select([...event.dataTransfer.files]);
      }}
    >
      {children}
      <div className="admin-image-picker__selection">
        <div className="admin-image-actions">
          <Button
            variant="secondary"
            aria-describedby={descriptionId}
            aria-label={`${action}: ${label}`}
            disabled={disabled}
            onClick={() => input.current?.click()}
            type="button"
          >
            {action}
          </Button>
          {actions}
        </div>
        <small id={`${id}-help`} className={compact ? "admin-visually-hidden" : undefined}>
          {multiple ? "O arrastra aquí tus fotos." : "O arrastra aquí una imagen."}
          <br />
          JPEG, PNG o WebP · máximo 25 MiB por imagen
        </small>
      </div>
      <input
        accept="image/jpeg,image/png,image/webp"
        aria-describedby={descriptionId}
        aria-invalid={Boolean(message)}
        aria-label={label}
        className="admin-visually-hidden"
        disabled={disabled}
        multiple={multiple}
        onChange={(event) => {
          select([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = "";
        }}
        ref={input}
        tabIndex={-1}
        type="file"
      />
      {message ? (
        <small className="admin-image-error" id={`${id}-error`} role="alert">
          {message}
        </small>
      ) : null}
    </div>
  );
}
