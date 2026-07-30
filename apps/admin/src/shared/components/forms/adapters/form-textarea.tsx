import { useId } from "react";
import { useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type FormTextareaProps<TValues extends FieldValues> = {
  disabled?: boolean;
  label: string;
  name: FieldPath<TValues>;
  rows?: number;
};
export function FormTextarea<TValues extends FieldValues>({
  disabled = false,
  label,
  name,
  rows = 5,
}: FormTextareaProps<TValues>) {
  const inputId = useId();
  const { formState, getFieldState, register } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  return (
    <label className="admin-field" htmlFor={inputId}>
      <span>{label}</span>
      <textarea {...register(name)} aria-invalid={Boolean(error)} id={inputId} readOnly={disabled} rows={rows} />
      {error ? <small role="alert">{error}</small> : null}
    </label>
  );
}
