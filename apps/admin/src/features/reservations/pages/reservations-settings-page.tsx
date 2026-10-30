import { Button, InlineMessage } from "@jmurga97/components";
import { Suspense } from "react";
import { FormProvider } from "react-hook-form";

import { useReservationSettings } from "~/features/reservations/hooks/use-reservation-settings";
import { WEEKDAYS } from "~/features/reservations/services";
import { i18n } from "~/lib/i18n";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormActions } from "~/shared/components/forms/form-actions";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { ReservationSettingsController } from "~/features/reservations/hooks/use-reservation-settings";
import type { ReservationSettingsFormValues } from "~/features/reservations/types";

const MAX_SLOTS_PER_DAY = 48;

export function ReservationsSettingsPage() {
  const branch = useSelectedBranch();
  if (!branch) return null;

  return (
    <Suspense fallback={<CardSkeleton rows={4} title={i18n.t("reservations___Ajustes")} />}>
      <SettingsForm branchId={branch.id} key={branch.id} />
    </Suspense>
  );
}

function SettingsForm({ branchId }: { branchId: string }) {
  const settings = useReservationSettings(branchId);
  useEditorGuard({ dirty: settings.form.formState.isDirty, pending: settings.saving });

  return (
    <FormProvider {...settings.form}>
      <form className={"reservations-settings"} noValidate onSubmit={(event) => void settings.save(event)}>
        <fieldset className={"admin-card"} aria-labelledby={"reservations-rules-title"}>
          <h2 id={"reservations-rules-title"}>{i18n.t("reservations___Reservas online")}</h2>
          <FormCheckbox<ReservationSettingsFormValues>
            label={i18n.t("reservations___Aceptar reservas desde la carta")}
            name={"isEnabled"}
          />
          <div className={"reservations-settings-grid"}>
            <NumberField label={i18n.t("reservations___Mesas por hora")} name={"slotCapacity"} />
            <NumberField label={i18n.t("reservations___Máximo de personas por reserva")} name={"onlinePartyLimit"} />
            <NumberField
              label={i18n.t("reservations___Días que se puede reservar por adelantado")}
              name={"windowDays"}
            />
            <NumberField label={i18n.t("reservations___Antelación mínima (horas)")} name={"leadTimeHours"} />
          </div>
          <p className={"admin-copy"}>
            {i18n.t(
              "reservations___Cada reserva ocupa una mesa, sea cual sea el número de personas. A partir del máximo, la carta invita a llamar.",
            )}
          </p>
        </fieldset>
        <fieldset className={"admin-card"} aria-labelledby={"reservations-answers-title"}>
          <h2 id={"reservations-answers-title"}>{i18n.t("reservations___Respuesta y confirmación")}</h2>
          <div className={"reservations-settings-grid"}>
            <NumberField label={i18n.t("reservations___Tiempo para responder (horas)")} name={"responseTimeHours"} />
            <NumberField
              label={i18n.t("reservations___Enviar la confirmación por WhatsApp (horas antes)")}
              name={"checkBeforeHours"}
            />
            <NumberField
              label={i18n.t("reservations___Plazo para confirmar (minutos antes)")}
              name={"checkDeadlineMinutes"}
            />
          </div>
          <p className={"admin-copy"}>
            {i18n.t(
              "reservations___Si nadie responde a tiempo, la solicitud se acepta sola. Si el cliente no confirma por WhatsApp, la reserva se marca sin confirmar y mantiene su mesa.",
            )}
          </p>
        </fieldset>
        <SlotsEditor settings={settings} />
        <FormActions
          busy={settings.saving}
          onSubmit={() => void settings.save()}
          submitLabel={i18n.t("reservations___Guardar ajustes")}
          submitType={"submit"}
        />
      </form>
    </FormProvider>
  );
}

function NumberField({ label, name }: { label: string; name: keyof ReservationSettingsFormValues }) {
  return (
    <FormTextInput<ReservationSettingsFormValues> inputMode={"numeric"} label={label} name={name} type={"number"} />
  );
}

function SlotsEditor({ settings }: { settings: ReservationSettingsController }) {
  const slotsError =
    settings.form.formState.errors.slots?.root?.message ?? settings.form.formState.errors.slots?.message;

  return (
    <fieldset className={"admin-card"} aria-labelledby={"reservations-slots-title"}>
      <h2 id={"reservations-slots-title"}>{i18n.t("reservations___Horas de reserva")}</h2>
      <p className={"admin-copy"}>
        {i18n.t("reservations___Las horas a las que se puede llegar cada día, en la hora del restaurante.")}
      </p>
      {slotsError ? <InlineMessage tone={"error"}>{slotsError}</InlineMessage> : null}
      <div className={"reservations-weekdays"}>
        {WEEKDAYS.map(({ label, weekday }) => {
          const rows = settings.rowsFor(weekday);

          return (
            <div className={"reservations-weekday"} key={weekday}>
              <h3>{label}</h3>
              {rows.length === 0 ? <p className={"admin-copy"}>{i18n.t("reservations___Sin reservas")}</p> : null}
              {rows.map(({ field, index }) => (
                <div className={"reservations-slot-input"} key={field.id}>
                  <FormTextInput<ReservationSettingsFormValues>
                    label={i18n.t("reservations___Hora de {{day}}", { day: label })}
                    name={`slots.${index}.time`}
                    type={"time"}
                  />
                  <Button
                    aria-label={i18n.t("reservations___Quitar {{time}} del {{day}}", { time: field.time, day: label })}
                    onClick={() => settings.removeSlot(index)}
                    size={"sm"}
                    type={"button"}
                    variant={"ghost"}
                  >
                    {i18n.t("reservations___Quitar")}
                  </Button>
                </div>
              ))}
              <div className={"reservations-weekday-actions"}>
                <Button
                  disabled={rows.length >= MAX_SLOTS_PER_DAY}
                  onClick={() => settings.addSlot(weekday)}
                  size={"sm"}
                  type={"button"}
                  variant={"secondary"}
                >
                  {i18n.t("reservations___Añadir hora")}
                </Button>
                {rows.length > 0 ? (
                  <Button
                    aria-label={i18n.t("reservations___Copiar las horas del {{day}} a todos los días", { day: label })}
                    onClick={() => settings.copyToAllDays(weekday)}
                    size={"sm"}
                    type={"button"}
                    variant={"ghost"}
                  >
                    {i18n.t("reservations___Copiar a todos los días")}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
