import { McTextarea } from "@murga.ing/components/react";
import { useId } from "react";
import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

interface FormTextareaProps<TValues extends FieldValues> {
  hint?: string;
  label: string;
  name: FieldPath<TValues>;
  optional?: boolean;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}

export function FormTextarea<TValues extends FieldValues>({
  hint,
  label,
  name,
  optional = false,
  placeholder,
  required = false,
  rows = 5,
}: FormTextareaProps<TValues>) {
  const inputId = useId();
  const { control } = useFormContext<TValues>();
  const { field, fieldState } = useController({ name, control });

  return (
    <mc-field
      error={fieldState.error?.message}
      hint={hint}
      inputId={inputId}
      invalid={fieldState.invalid}
      label={label}
      optional={optional}
      required={required}
    >
      <McTextarea
        inputId={inputId}
        invalid={fieldState.invalid}
        onMcChange={(event) => {
          field.onChange(event.detail.value);
        }}
        placeholder={placeholder}
        ref={field.ref}
        rows={rows}
        value={String(field.value ?? "")}
      />
    </mc-field>
  );
}
