import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";

import { useBranchForm } from "../branch-form-context";
import { DAYS } from "../types";

import type { BranchFormValues } from "../types";

export function ScheduleSection() {
  const { controller } = useBranchForm();
  return (
    <section className="admin-editor-section">
      <div className="admin-kicker">Horario semanal</div>
      <div className="admin-schedule-grid">
        {controller.fields.map((field, index) => (
          <div className="admin-schedule-row" key={field.id}>
            <FormCheckbox<BranchFormValues>
              label={DAYS[index] ?? String(field.dayOfWeek)}
              name={`schedules.${index}.enabled`}
            />
            {(["open", "close"] as const).map((name) => (
              <FormTextInput<BranchFormValues>
                disabled={!controller.schedules[index]?.enabled}
                key={name}
                label={`${name === "open" ? "Apertura" : "Cierre"} ${DAYS[index]}`}
                name={`schedules.${index}.${name}`}
                type="time"
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
