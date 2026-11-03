import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";
import { getInstallSteps } from "~/shared/hooks/use-install-prompt";

import type { InstallSteps } from "~/shared/hooks/use-install-prompt";

const STEPS: Record<InstallSteps, () => string> = {
  ios: () => i18n.t("shell___Toca Compartir y luego «Añadir a pantalla de inicio»."),
  macSafari: () => i18n.t("shell___En la barra de menús, elige Archivo → «Añadir al Dock»."),
  browserMenu: () =>
    i18n.t(
      "shell___Abre el menú del navegador y elige «Instalar app» o «Añadir a pantalla de inicio». En ordenador también aparece un icono de instalar en la barra de direcciones.",
    ),
};

/** Shown when the browser gives the page no install prompt of its own: Safari, Firefox on Android, Brave. */
export function InstallAppDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="admin-dialog-backdrop" />
        <Dialog.Viewport className="admin-dialog-viewport">
          <Dialog.Popup className="admin-dialog-popup">
            <Dialog.Title>{i18n.t("shell___Instalar QMenut")}</Dialog.Title>
            <Dialog.Description>
              {i18n.t("shell___Se abre como una app y recibe notificaciones en este dispositivo.")}
            </Dialog.Description>
            <p className="admin-copy">{STEPS[getInstallSteps()]()}</p>
            <div className="ming-cluster">
              <Button onClick={onClose}>{i18n.t("shell___Entendido")}</Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
