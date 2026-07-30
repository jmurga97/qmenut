import { useId } from "react";
import { useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type SelectOption = {
  disabled?: boolean;
  id: string;
  label: string;
};
type FormSelectProps<TValues extends FieldValues> = {
  label: string;
  name: FieldPath<TValues>;
  options: SelectOption[];
};
export function FormSelect<TValues extends FieldValues>({ label, name, options }: FormSelectProps<TValues>) {
  const inputId = useId();
  const { formState, getFieldState, register } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  return (
    <label className="admin-field" htmlFor={inputId}>
      <span>{label}</span>
      <select {...register(name)} aria-invalid={Boolean(error)} id={inputId}>
        <option value="">Selecciona…</option>
        {options.map((option) => (
          <option disabled={option.disabled} key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <small role="alert">{error}</small> : null}
    </label>
  );
}
