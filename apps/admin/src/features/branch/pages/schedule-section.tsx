import { Button, Checkbox } from "@jmurga97/components";

import { i18n } from "~/lib/i18n";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { DAYS } from "~/shared/services/week-time";

import { useBranchForm } from "../branch-form-context-value";

import type { BranchFormValues } from "../types";

export function ScheduleSection() {
  const { controller } = useBranchForm();
  return (
    <section className="admin-editor-section">
      <h2 className={"ming-section__title"}>{i18n.t("branch___Horario semanal")}</h2>
      <div className="admin-schedule-grid">
        {DAYS.map((day, dayIndex) => {
          const dayOfWeek = dayIndex + 1;
          const rows = controller.fields
            .flatMap((field, index) => (field.dayOfWeek === dayOfWeek ? [{ field, index }] : []))
            .map((row, index) => ({ ...row, position: index + 1 }));
          return (
            <div className="admin-schedule-day" key={day}>
              <div className="admin-schedule-day-header">
                <Checkbox
                  checked={rows.length > 0}
                  label={day}
                  onCheckedChange={(checked) => controller.setScheduleEnabled(dayOfWeek, checked)}
                />
                {rows.length > 0 ? (
                  <span className="admin-schedule-count">
                    {rows.length === 1
                      ? i18n.t("branch___{{count}} franja", { count: rows.length })
                      : i18n.t("branch___{{count}} franjas", { count: rows.length })}
                  </span>
                ) : null}
              </div>
              {rows.length > 0 ? (
                <div className="admin-schedule-intervals">
                  {rows.map(({ field, index, position }) => (
                    <div className="admin-schedule-interval" key={field.id}>
                      <FormTextInput<BranchFormValues>
                        label={i18n.t("branch___Apertura {{day}}", { day })}
                        name={`schedules.${index}.open`}
                        type={"time"}
                      />
                      <FormTextInput<BranchFormValues>
                        label={i18n.t("branch___Cierre {{day}}", { day })}
                        name={`schedules.${index}.close`}
                        type={"time"}
                      />
                      {rows.length > 1 ? (
                        <Button
                          aria-label={i18n.t("branch___Quitar franja {{position}} de {{day}}", { position, day })}
                          onClick={() => controller.removeSchedule(index)}
                          size={"sm"}
                          type={"button"}
                          variant={"ghost"}
                        >
                          {i18n.t("branch___Quitar")}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                disabled={controller.fields.length >= 21}
                onClick={() => controller.addSchedule(dayOfWeek)}
                size={"sm"}
                type={"button"}
                variant={"secondary"}
              >
                {rows.length > 0 ? i18n.t("branch___Añadir franja") : i18n.t("branch___Añadir horario")}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
