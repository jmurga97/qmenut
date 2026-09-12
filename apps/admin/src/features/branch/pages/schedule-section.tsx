import { Button, Checkbox } from "@jmurga97/components";

import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { Icon } from "~/shared/components/icon";

import { useBranchForm } from "../branch-form-context-value";
import { DAYS } from "../types";

import type { BranchFormValues } from "../types";

export function ScheduleSection() {
  const { controller } = useBranchForm();
  return (
    <section className="admin-editor-section">
      <div className="admin-kicker">Horario semanal</div>
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
                    {rows.length} {rows.length === 1 ? "franja" : "franjas"}
                  </span>
                ) : null}
              </div>
              {rows.length > 0 ? (
                <div className="admin-schedule-intervals">
                  {rows.map(({ field, index, position }) => (
                    <div className="admin-schedule-interval" key={field.id}>
                      <FormTextInput<BranchFormValues>
                        label={`Apertura ${day}`}
                        name={`schedules.${index}.open`}
                        type="time"
                      />
                      <FormTextInput<BranchFormValues>
                        label={`Cierre ${day}`}
                        name={`schedules.${index}.close`}
                        type="time"
                      />
                      {rows.length > 1 ? (
                        <Button
                          aria-label={`Quitar franja ${position} de ${day}`}
                          onClick={() => controller.removeSchedule(index)}
                          size="sm"
                          type="button"
                          variant="ghost"
                        >
                          <Icon name="trash" /> Quitar
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <Button
                disabled={controller.fields.length >= 21}
                onClick={() => controller.addSchedule(dayOfWeek)}
                size="sm"
                type="button"
                variant="secondary"
              >
                <Icon name="plus" /> {rows.length > 0 ? "Añadir franja" : "Añadir horario"}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
