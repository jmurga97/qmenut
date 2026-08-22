import { useId, useRef } from "react";

import { ImageUploadControl } from "./image-upload-control";

import type { ImageDraft } from "./image-draft";

interface ImageGalleryControlProps {
  disabled?: boolean;
  drafts: ImageDraft[];
  error?: string;
  label: string;
  maximum?: number;
  onAdd: (files: File[]) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, file: File) => void;
  onRetry: (id: string) => void;
}

export function ImageGalleryControl({
  disabled = false,
  drafts,
  error,
  label,
  maximum = 20,
  onAdd,
  onMove,
  onRemove,
  onReplace,
  onRetry,
}: ImageGalleryControlProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <section className="admin-image-gallery">
      <div className="admin-image-gallery__header">
        <div>
          <div className="admin-image-control__label">{label}</div>
          <p>La primera foto será la portada. Puedes cambiar el orden antes de guardar.</p>
        </div>
        <span>
          {drafts.length}/{maximum}
        </span>
      </div>
      {drafts.length > 0 ? (
        <ol className="admin-photo-strip">
          {drafts.map((draft, index) => (
            <li key={draft.id}>
              <span className="admin-photo-strip__number">{String(index + 1).padStart(2, "0")}</span>
              <ImageUploadControl
                disabled={disabled}
                draft={draft}
                label={`Foto ${index + 1}`}
                onRemove={() => onRemove(draft.id)}
                onSelect={(file) => onReplace(draft.id, file)}
                onRetry={() => onRetry(draft.id)}
              />
              <div className="admin-photo-strip__order">
                <button
                  aria-label={`Mover foto ${index + 1} hacia la izquierda`}
                  disabled={disabled || index === 0}
                  onClick={() => onMove(draft.id, -1)}
                  type="button"
                >
                  ←
                </button>
                <button
                  aria-label={`Mover foto ${index + 1} hacia la derecha`}
                  disabled={disabled || index === drafts.length - 1}
                  onClick={() => onMove(draft.id, 1)}
                  type="button"
                >
                  →
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="admin-image-gallery__empty">Añade fotos del espacio, la terraza o tus platos.</p>
      )}
      <button
        className="admin-image-gallery__add"
        disabled={disabled || drafts.length >= maximum}
        onClick={() => inputRef.current?.click()}
        type="button"
      >
        + Añadir fotos
      </button>
      <label className="admin-visually-hidden" htmlFor={inputId}>
        Añadir fotos a la galería
      </label>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="admin-visually-hidden"
        disabled={disabled}
        id={inputId}
        multiple
        onChange={(event) => {
          onAdd([...(event.currentTarget.files ?? [])]);
          event.currentTarget.value = "";
        }}
        ref={inputRef}
        type="file"
      />
      {error ? <small className="admin-image-error">{error}</small> : null}
    </section>
  );
}
