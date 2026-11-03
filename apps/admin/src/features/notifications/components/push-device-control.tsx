import { Button, Checkbox, InlineMessage } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { usePushDevice } from "~/features/notifications/hooks/use-push-device";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";

import type { PushDeviceStatus } from "~/features/notifications/hooks/use-push-device";

/**
 * "Notifications on this device": the browser asks for permission only after the member taps the button.
 * `compact` drops the heading when a dialog already titles it.
 */
export function PushDeviceControl({
  selectedBranchId,
  compact = false,
}: {
  selectedBranchId: string;
  compact?: boolean;
}) {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const device = usePushDevice();
  const [draft, setDraft] = useState<string[] | null>(null);
  const branchIds = draft ?? device.followedBranchIds ?? [selectedBranchId];

  if (device.status !== "off" && device.status !== "on") return <PushStatusMessage status={device.status} />;

  const isOn = device.status === "on";
  const changed = isOn && draft !== null;
  function toggle(branchId: string, checked: boolean) {
    setDraft(checked ? [...new Set([...branchIds, branchId])] : branchIds.filter((id) => id !== branchId));
  }

  return (
    <section aria-labelledby={compact ? undefined : "push-device-title"} className="notifications-device ming-stack">
      {compact ? null : (
        <div>
          <h2 id="push-device-title">{i18n.t("notifications___Notificaciones en este dispositivo")}</h2>
          <p className="admin-copy">
            {isOn
              ? i18n.t("notifications___Este dispositivo recibe avisos de las sucursales marcadas.")
              : i18n.t("notifications___Recibe un aviso en este dispositivo cuando haya algo que atender.")}
          </p>
        </div>
      )}
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
            <Button disabled={device.test.pending} onClick={device.sendTest} variant={"ghost"}>
              {i18n.t("notifications___Enviar prueba")}
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
      {isOn ? <TestPushResult test={device.test} /> : null}
    </section>
  );
}

function TestPushResult({ test }: { test: { sent: boolean; failed: boolean } }) {
  if (test.sent) {
    return (
      <p className="admin-copy" role={"status"}>
        {i18n.t("notifications___Prueba enviada. Debería llegar en unos segundos.")}
      </p>
    );
  }
  if (test.failed) {
    return (
      <p className="admin-copy" role={"alert"}>
        {i18n.t("notifications___No se pudo enviar. Desactiva y vuelve a activar las notificaciones.")}
      </p>
    );
  }
  return null;
}

/** Every state where the device cannot be turned on or off from here. */
function PushStatusMessage({ status }: { status: Exclude<PushDeviceStatus, "off" | "on"> }) {
  if (status === "loading" || status === "unavailable") return null;
  if (status === "unsupported") {
    return <p className="admin-copy">{i18n.t("notifications___Este navegador no admite notificaciones push.")}</p>;
  }
  if (status === "iosInstall") {
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
  if (status === "denied") {
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
  return null;
}
