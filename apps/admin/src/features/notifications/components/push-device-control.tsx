import { Button, Checkbox, InlineMessage } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { usePushDevice } from "~/features/notifications/hooks/use-push-device";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";

/** "Notifications on this device": the browser asks for permission only after the member taps the button. */
export function PushDeviceControl({ selectedBranchId }: { selectedBranchId: string }) {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const device = usePushDevice();
  const [draft, setDraft] = useState<string[] | null>(null);
  const branchIds = draft ?? device.followedBranchIds ?? [selectedBranchId];

  if (device.status === "loading" || device.status === "unavailable") return null;
  if (device.status === "unsupported") {
    return <p className="admin-copy">{i18n.t("notifications___Este navegador no admite notificaciones push.")}</p>;
  }
  if (device.status === "iosInstall") {
    return (
      <InlineMessage
        message={i18n.t(
          "notifications___En iPhone y iPad, añade el panel a la pantalla de inicio (Compartir → Añadir a inicio) y activa las notificaciones desde allí.",
        )}
        title={i18n.t("notifications___Instala el panel")}
        tone={"info"}
      />
    );
  }
  if (device.status === "denied") {
    return (
      <InlineMessage
        message={i18n.t(
          "notifications___Permite las notificaciones de este sitio en los ajustes del navegador y vuelve a intentarlo.",
        )}
        title={i18n.t("notifications___Notificaciones bloqueadas")}
        tone={"warning"}
      />
    );
  }

  const isOn = device.status === "on";
  const changed = isOn && draft !== null;
  function toggle(branchId: string, checked: boolean) {
    setDraft(checked ? [...new Set([...branchIds, branchId])] : branchIds.filter((id) => id !== branchId));
  }

  return (
    <section aria-labelledby="push-device-title" className="notifications-device ming-stack">
      <div>
        <h2 id="push-device-title">{i18n.t("notifications___Notificaciones en este dispositivo")}</h2>
        <p className="admin-copy">
          {isOn
            ? i18n.t("notifications___Este dispositivo recibe avisos de las sucursales marcadas.")
            : i18n.t("notifications___Recibe un aviso en este dispositivo cuando haya algo que atender.")}
        </p>
      </div>
      {tenant.branches.length > 1 ? (
        <fieldset className="notifications-branches">
          <legend>{i18n.t("notifications___Sucursales")}</legend>
          {tenant.branches.map((branch) => (
            <Checkbox
              checked={branchIds.includes(branch.id)}
              key={branch.id}
              label={branch.name}
              onCheckedChange={(checked) => toggle(branch.id, checked)}
            />
          ))}
        </fieldset>
      ) : null}
      <div className="ming-cluster">
        {isOn ? (
          <>
            <Button disabled={device.busy} onClick={() => void device.turnOff()} variant={"ghost"}>
              {i18n.t("notifications___Desactivar")}
            </Button>
            {changed ? (
              <Button
                disabled={device.busy || branchIds.length === 0}
                onClick={() => void device.updateBranches(branchIds).then(() => setDraft(null))}
              >
                {i18n.t("notifications___Guardar sucursales")}
              </Button>
            ) : null}
          </>
        ) : (
          <Button
            disabled={device.busy || branchIds.length === 0}
            onClick={() => void device.turnOn(branchIds).then(() => setDraft(null))}
          >
            {device.busy ? i18n.t("notifications___Activando…") : i18n.t("notifications___Activar en este dispositivo")}
          </Button>
        )}
      </div>
    </section>
  );
}
