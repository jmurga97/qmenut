import { useId } from "react";
import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

interface FormColorInputProps<TValues extends FieldValues> {
  label: string;
  name: FieldPath<TValues>;
}
export function FormColorInput<TValues extends FieldValues>({ label, name }: FormColorInputProps<TValues>) {
  const inputId = useId();
  const { control } = useFormContext<TValues>();
  const { field, fieldState } = useController({ control, name });
  const value = typeof field.value === "string" ? field.value : "";
  return (
    <mc-field error={fieldState.error?.message} invalid={fieldState.invalid} label={label}>
      <div className="admin-color-row">
        <input
          aria-label={`${label}: selector`}
          onChange={(event) => field.onChange(event.currentTarget.value)}
          type="color"
          value={value}
        />
        <input
          aria-label={label}
          id={inputId}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.currentTarget.value)}
          ref={field.ref}
          type="text"
          value={value}
        />
      </div>
    </mc-field>
  );
}
