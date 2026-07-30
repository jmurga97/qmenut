import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type ChipId = number | string;
interface FormChipGroupProps<TValues extends FieldValues> {
  label: string;
  name: FieldPath<TValues>;
  options: { id: ChipId; label: string }[];
}
export function FormChipGroup<TValues extends FieldValues>({ label, name, options }: FormChipGroupProps<TValues>) {
  const { control } = useFormContext<TValues>();
  const { field, fieldState } = useController({ control, name });
  const selected = Array.isArray(field.value) ? (field.value as ChipId[]) : [];
  function toggle(id: ChipId) {
    field.onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  }
  return (
    <section className="admin-editor-section">
      <div className="admin-kicker">{label}</div>
      <div className="admin-chip-row">
        {options.map((option) => {
          const active = selected.includes(option.id);
          return (
            <button
              aria-pressed={active}
              className={active ? "admin-chip admin-chip--active" : "admin-chip"}
              key={option.id}
              onClick={() => toggle(option.id)}
              type="button"
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {fieldState.error?.message ? <mc-inline-message message={fieldState.error.message} tone="error" /> : null}
    </section>
  );
}
