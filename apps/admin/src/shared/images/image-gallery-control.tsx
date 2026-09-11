import { Button } from "@jmurga97/components";
import { useRef, useState } from "react";

import { Icon } from "~/shared/components/icon";

import { imageStatusLabel } from "./image-draft";
import { ImageFilePicker } from "./image-file-picker";

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

const reorderKeys: Record<string, number> = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 };

function formatBytes(bytes: number) {
  return bytes < 1024 ** 2 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

function fileName(draft: ImageDraft, index: number) {
  const stored = draft.imageUrl?.split("?")[0]?.split("/").pop();
  // Stored URLs are not always file-shaped, so only borrow the basename when it actually looks like one.
  return draft.file?.name ?? (stored && /\.[a-z0-9]{3,4}$/i.test(stored) ? stored : `Foto ${index + 1}`);
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
  const gallery = useRef<HTMLElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const replacing = useRef<string | null>(null);
  const [dragged, setDragged] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [announcement, setAnnouncement] = useState("");
  const [dimensions, setDimensions] = useState<Record<string, string>>({});
  const locked = () => disabled || Boolean(gallery.current?.closest("fieldset:disabled, [inert]"));
  const handles = () => gallery.current?.querySelectorAll<HTMLButtonElement>(".admin-photo-list__handle");
  const move = (id: string, index: number) => {
    if (locked() || index < 0 || index >= drafts.length) return;
    // Focus travels with the row's DOM node, so grab the handle before the list reorders.
    handles()?.[drafts.findIndex((draft) => draft.id === id)]?.focus({ preventScroll: true });
    onMove(id, index);
    setAnnouncement(`Foto movida a la posición ${index + 1}${index === 0 ? ", portada" : ""}.`);
  };
  const remove = (id: string, index: number) => {
    if (locked()) return;
    const rows = handles();
    const next = rows?.[index + 1] ?? rows?.[index - 1];
    if (next) next.focus();
    else gallery.current?.querySelector<HTMLButtonElement>(":scope > .admin-image-picker button")?.focus();
    onRemove(id);
    setAnnouncement(`Foto ${index + 1} quitada. Los cambios se aplican al guardar.`);
  };
  return (
    <section aria-label={label} className="admin-image-gallery" ref={gallery}>
      <ImageFilePicker
        action="Elegir fotos"
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
      <ol className="admin-photo-list">
        {drafts.map((draft, index) => {
          const name = fileName(draft, index);
          const status = imageStatusLabel[draft.status] || (draft.changed ? "Pendiente de guardar" : "");
          return (
            <li
              aria-label={`Foto ${index + 1}${index === 0 ? ", portada" : ""}: ${name}`}
              className={target === draft.id ? "admin-photo-list__target" : undefined}
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
            >
              {/* ponytail: pointer drag + arrow keys only. Touch can set the cover but not reorder freely;
                  add a long-press drag (or up/down buttons) if that turns out to matter. */}
              <Button
                variant="ghost"
                aria-label={`Reordenar ${name}. Arrastra, o usa las flechas para moverla.`}
                className="admin-photo-list__handle"
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
                onKeyDown={(event) => {
                  const step = reorderKeys[event.key];
                  if (step === undefined && event.key !== "Home") return;
                  event.preventDefault();
                  move(draft.id, event.key === "Home" ? 0 : index + step);
                }}
                type="button"
              >
                <Icon name="drag" />
              </Button>
              <div className="admin-photo-list__thumb">
                {draft.previewUrl ? (
                  <img
                    alt=""
                    draggable={false}
                    onLoad={(event) => {
                      // Read before the updater runs: React nulls currentTarget once the handler returns.
                      const { naturalHeight, naturalWidth } = event.currentTarget;
                      setDimensions((current) => ({ ...current, [draft.id]: `${naturalWidth}×${naturalHeight}` }));
                    }}
                    src={draft.previewUrl}
                  />
                ) : null}
              </div>
              <div className="admin-photo-list__meta">
                <span className="admin-photo-list__name" title={name}>
                  {name}
                </span>
                <span className="admin-photo-list__facts">
                  {draft.file ? <span>{formatBytes(draft.file.size)}</span> : null}
                  {dimensions[draft.id] ? <span>{dimensions[draft.id]}</span> : null}
                  {index === 0 ? <span className="admin-photo-list__badge">Portada</span> : null}
                  {status ? (
                    <span aria-live="polite" className={`admin-image-status admin-image-status--${draft.status}`}>
                      {status}
                    </span>
                  ) : null}
                </span>
                {draft.error ? (
                  <small className="admin-image-error" role="alert">
                    {draft.error}
                  </small>
                ) : null}
              </div>
              <div className="admin-photo-list__actions">
                <Button
                  variant="secondary"
                  aria-label={`Usar ${name} como portada`}
                  disabled={disabled || index === 0}
                  onClick={() => move(draft.id, 0)}
                  title="Usar como portada"
                  type="button"
                >
                  <Icon name="star" />
                </Button>
                <Button
                  variant="secondary"
                  aria-label={`Reemplazar ${name}`}
                  disabled={disabled}
                  onClick={() => {
                    replacing.current = draft.id;
                    replaceInput.current?.click();
                  }}
                  title="Reemplazar"
                  type="button"
                >
                  <Icon name="image" />
                </Button>
                <Button
                  variant="secondary"
                  aria-label={`Quitar ${name}`}
                  className="admin-photo-list__remove"
                  disabled={disabled}
                  onClick={() => remove(draft.id, index)}
                  title="Quitar"
                  type="button"
                >
                  <Icon name="trash" />
                </Button>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="admin-image-gallery__footer">
        <small className="admin-image-help">La primera foto será la portada. Los cambios se aplican al guardar.</small>
        <span>
          {drafts.length} de {maximum}
        </span>
      </div>
      <input
        accept="image/jpeg,image/png,image/webp"
        className="admin-visually-hidden"
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file && replacing.current && !locked()) onReplace(replacing.current, file);
        }}
        ref={replaceInput}
        tabIndex={-1}
        type="file"
      />
      <span aria-live="polite" className="admin-visually-hidden">
        {announcement}
      </span>
    </section>
  );
}
