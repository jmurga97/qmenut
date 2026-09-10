import { Button } from "@jmurga97/components";
import { useId, useRef, useState } from "react";

import { ImageFilePicker } from "./image-file-picker";
import { ImageUploadControl } from "./image-upload-control";

import type { ImageDraft } from "./image-draft";

interface ImageGalleryControlProps {
  disabled?: boolean;
  drafts: ImageDraft[];
  error?: string;
  label: string;
  maximum?: number;
  onAdd: (files: File[]) => void;
  onMove: (id: string, target: number) => void;
  onRemove: (id: string) => void;
  onReplace: (id: string, file: File) => void;
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
}: ImageGalleryControlProps) {
  const headingId = useId();
  const gallery = useRef<HTMLElement>(null);
  const [dragged, setDragged] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const locked = () => disabled || Boolean(gallery.current?.closest("fieldset:disabled, [inert]"));
  const move = (id: string, index: number) => {
    if (locked()) return;
    const currentIndex = drafts.findIndex((draft) => draft.id === id);
    gallery.current?.querySelectorAll<HTMLLIElement>(":scope > ol > li")[currentIndex]?.focus({ preventScroll: true });
    onMove(id, index);
    setAnnouncement(`Foto movida a la posición ${index + 1}${index === 0 ? ", portada" : ""}.`);
  };
  const remove = (id: string, index: number) => {
    if (locked()) return;
    const cards = gallery.current?.querySelectorAll<HTMLLIElement>(":scope > ol > li");
    const next = cards?.[index + 1] ?? cards?.[index - 1];
    if (next) next.focus();
    else gallery.current?.querySelector<HTMLButtonElement>(":scope > .admin-image-picker button")?.focus();
    onRemove(id);
    setAnnouncement(`Foto ${index + 1} quitada. Los cambios se aplican al guardar.`);
  };
  return (
    <section aria-labelledby={headingId} className="admin-image-gallery" ref={gallery}>
      <div className="admin-image-gallery__header">
        <div>
          <h3 className="admin-image-control__label" id={headingId}>
            {label}
          </h3>
          <p>La primera foto será la portada. Los cambios se aplican al guardar.</p>
        </div>
        <span>
          {drafts.length} de {maximum}
        </span>
      </div>
      <ImageFilePicker
        action="Seleccionar fotos"
        disabled={disabled || drafts.length >= maximum}
        error={error}
        label={label}
        multiple
        onSelect={onAdd}
      >
        {drafts.length === 0 ? (
          <p className="admin-image-gallery__empty">Añade fotos del espacio, la terraza o tus platos.</p>
        ) : null}
      </ImageFilePicker>
      {drafts.length >= maximum ? (
        <small className="admin-image-help">
          Has alcanzado el máximo de {maximum} fotos. Quita una para añadir otra.
        </small>
      ) : null}
      <ol className="admin-photo-grid">
        {drafts.map((draft, index) => (
          <li
            aria-label={`Foto ${index + 1}${index === 0 ? ", portada" : ""}`}
            className={target === draft.id ? "admin-photo-grid__target" : undefined}
            key={draft.id}
            onDragOver={(event) => {
              if (!dragged || locked() || event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setTarget(draft.id);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTarget(undefined);
            }}
            onDrop={(event) => {
              if (!dragged || event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              move(dragged, index);
              setDragged(undefined);
              setTarget(undefined);
            }}
            tabIndex={-1}
          >
            <div className="admin-photo-grid__heading">
              <span className={index === 0 ? "admin-photo-grid__cover" : "admin-image-help"}>
                {index === 0 ? "Portada" : `Foto ${index + 1}`}
              </span>
              <Button
                variant="secondary"
                aria-label={`Arrastrar foto ${index + 1} para reordenar`}
                className="admin-photo-grid__handle"
                disabled={disabled}
                draggable={!disabled}
                onDragStart={(event) => {
                  if (locked()) {
                    event.preventDefault();
                    return;
                  }
                  event.dataTransfer.setData("text/plain", draft.id);
                  event.dataTransfer.effectAllowed = "move";
                  setDragged(draft.id);
                }}
                onDragEnd={() => {
                  setDragged(undefined);
                  setTarget(undefined);
                }}
                tabIndex={-1}
                type="button"
              >
                ⠿
              </Button>
            </div>
            <ImageUploadControl
              compact
              disabled={disabled}
              draft={draft}
              label={`Foto ${index + 1}`}
              onRemove={() => remove(draft.id, index)}
              onSelect={(file) => onReplace(draft.id, file)}
            />
            <div className="admin-photo-grid__order">
              <Button
                variant="secondary"
                aria-label={`Mover foto ${index + 1} antes`}
                disabled={disabled || index === 0}
                onClick={() => move(draft.id, index - 1)}
                type="button"
              >
                ← Antes
              </Button>
              <Button
                variant="secondary"
                aria-label={`Mover foto ${index + 1} después`}
                disabled={disabled || index === drafts.length - 1}
                onClick={() => move(draft.id, index + 1)}
                type="button"
              >
                Después →
              </Button>
              <Button
                variant="secondary"
                aria-label={`Usar foto ${index + 1} como portada`}
                disabled={disabled || index === 0}
                onClick={() => move(draft.id, 0)}
                type="button"
              >
                Usar como portada
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <span aria-live="polite" className="admin-visually-hidden">
        {announcement}
      </span>
    </section>
  );
}
