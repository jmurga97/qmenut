import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@jmurga97/components";
import { useState } from "react";

import { PushDeviceControl } from "~/features/notifications/components/push-device-control";
import { usePushDevice } from "~/features/notifications/hooks/use-push-device";
import { i18n } from "~/lib/i18n";
import { isStandalone } from "~/shared/hooks/use-install-prompt";

const SNOOZE_STORAGE_KEY = "qmenut-push-prompt-snoozed-until";
const SNOOZE_MS = 14 * 24 * 60 * 60 * 1000;

function isSnoozed(): boolean {
  try {
    return Number(window.localStorage.getItem(SNOOZE_STORAGE_KEY)) > Date.now();
  } catch {
    return false;
  }
}

function snooze(): void {
  try {
    window.localStorage.setItem(SNOOZE_STORAGE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {
    // Without storage it asks again on the next start.
  }
}

/**
 * Mounted in the shell for every member: `usePushDevice` also keeps the device language in sync. The dialog
 * itself only opens in the installed app, where a reinstall silently drops push (iOS gives each install its own
 * storage and permission). The browser prompt still only opens from the member's tap inside it.
 */
export function PushDevicePrompt({ selectedBranchId }: { selectedBranchId: string }) {
  const device = usePushDevice();
  const [dismissed, setDismissed] = useState(isSnoozed);
  const [shown, setShown] = useState(false);

  // Latch: once open, it stays open through "denied" so the member sees why it failed.
  if (!shown && !dismissed && device.status === "off" && isStandalone()) setShown(true);

  function close() {
    snooze();
    setDismissed(true);
  }

  return (
    <Dialog.Root
      open={shown && !dismissed && device.status !== "on"}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="admin-dialog-backdrop" />
        <Dialog.Viewport className="admin-dialog-viewport">
          <Dialog.Popup className="admin-dialog-popup">
            <Dialog.Title>{i18n.t("notifications___¿Activar notificaciones en este dispositivo?")}</Dialog.Title>
            <Dialog.Description>
              {i18n.t("notifications___Recibe un aviso en este dispositivo cuando haya algo que atender.")}
            </Dialog.Description>
            <PushDeviceControl compact selectedBranchId={selectedBranchId} />
            <div className="ming-cluster">
              <Button onClick={close} variant={"ghost"}>
                {i18n.t("notifications___Ahora no")}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
