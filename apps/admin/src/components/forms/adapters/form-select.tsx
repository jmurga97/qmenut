import { McSelect } from "@murga.ing/components/react";
import { useId, useState } from "react";
import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

interface SelectOption {
  description?: string;
  disabled?: boolean;
  id: string;
  label: string;
}

interface FormSelectProps<TValues extends FieldValues> {
  hint?: string;
  label: string;
  name: FieldPath<TValues>;
  options: SelectOption[];
  optional?: boolean;
  placeholder?: string;
  required?: boolean;
}

export function FormSelect<TValues extends FieldValues>({
  hint,
  label,
  name,
  options,
  optional = false,
  placeholder = "Selecciona…",
  required = false,
}: FormSelectProps<TValues>) {
  const inputId = useId();
  const [open, setOpen] = useState(false);
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
      <McSelect
        inputId={inputId}
        onMcChange={(event) => {
          field.onChange(event.detail.selectedId ?? "");
          setOpen(false);
        }}
        onMcOpenChange={(event) => {
          setOpen(event.detail.open);
        }}
        open={open}
        options={options}
        placeholder={placeholder}
        ref={field.ref}
        selectedId={typeof field.value === "string" && field.value.length > 0 ? field.value : null}
      />
    </mc-field>
  );
}
