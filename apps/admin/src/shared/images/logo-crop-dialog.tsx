import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { useState } from "react";
import Cropper from "react-easy-crop";

import { i18n } from "~/lib/i18n";

import type { Area, Point } from "react-easy-crop";

const LOGO_SIZE = 512;
const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;

export interface LogoCropSource {
  file: File;
  url: string;
}

interface LogoCropDialogProps {
  source: LogoCropSource | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

// The area can exceed the image when zoomed out, so the whole bitmap is drawn shifted and scaled
// instead of using a source rect: everything outside the image stays transparent padding.
async function cropLogo(file: File, area: Area): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(LOGO_SIZE, LOGO_SIZE);
  const scale = LOGO_SIZE / area.width;
  canvas
    .getContext("2d")
    ?.drawImage(bitmap, -area.x * scale, -area.y * scale, bitmap.width * scale, bitmap.height * scale);
  bitmap.close();
  const blob = await canvas.convertToBlob({ type: "image/png" });
  return new File([blob], `${file.name.replace(/\.\w+$/, "")}.png`, { type: "image/png" });
}

export function LogoCropDialog({ source, onCancel, onConfirm }: LogoCropDialogProps) {
  return (
    <Dialog.Root
      open={source !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="admin-dialog-backdrop" />
        <Dialog.Viewport className="admin-dialog-viewport">
          <Dialog.Popup className="admin-dialog-popup">
            <Dialog.Title>{i18n.t("images___Ajustar logo")}</Dialog.Title>
            <Dialog.Description>
              {i18n.t("images___Arrastra para centrar y usa el zoom para encuadrar el logo.")}
            </Dialog.Description>
            {source ? <LogoCropper key={source.url} onConfirm={onConfirm} source={source} /> : null}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function LogoCropper({ source, onConfirm }: { source: LogoCropSource; onConfirm: (file: File) => void }) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const confirm = async () => {
    if (!area) return;
    setBusy(true);
    try {
      onConfirm(await cropLogo(source.file, area));
    } catch (error) {
      console.error("Logo crop failed:", { error });
      setError(i18n.t("images___No se pudo recortar la imagen. Prueba con otra."));
      setBusy(false);
    }
  };

  return (
    <>
      <div className="admin-logo-crop">
        <Cropper
          aspect={1}
          crop={crop}
          image={source.url}
          maxZoom={MAX_ZOOM}
          minZoom={MIN_ZOOM}
          objectFit={"cover"}
          onCropChange={setCrop}
          onCropComplete={(_, pixels) => setArea(pixels)}
          // Start zoomed out so the whole logo fits inside the square, whatever its aspect ratio.
          onMediaLoaded={({ naturalWidth, naturalHeight }) =>
            setZoom(Math.max(MIN_ZOOM, Math.min(naturalWidth, naturalHeight) / Math.max(naturalWidth, naturalHeight)))
          }
          onZoomChange={setZoom}
          restrictPosition={false}
          showGrid={false}
          zoom={zoom}
        />
      </div>
      <label className="admin-logo-crop__zoom">
        <span>{i18n.t("images___Zoom")}</span>
        <input
          max={MAX_ZOOM}
          min={MIN_ZOOM}
          onChange={(event) => setZoom(Number(event.currentTarget.value))}
          step={0.01}
          type={"range"}
          value={zoom}
        />
      </label>
      {error ? (
        <small className="admin-image-error" role={"alert"}>
          {error}
        </small>
      ) : null}
      <div className="admin-dialog-actions">
        <Dialog.Close className={buttonVariants({ size: "md", variant: "secondary" })} disabled={busy}>
          {i18n.t("images___Cancelar")}
        </Dialog.Close>
        <Button disabled={busy || !area} onClick={() => void confirm()} type={"button"}>
          {i18n.t("images___Aplicar")}
        </Button>
      </div>
    </>
  );
}
