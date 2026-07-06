import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

interface FormCheckboxProps<TValues extends FieldValues> {
  label: string;
  name: FieldPath<TValues>;
}

export function FormCheckbox<TValues extends FieldValues>({ label, name }: FormCheckboxProps<TValues>) {
  const { control } = useFormContext<TValues>();
  const { field } = useController({ name, control });

  return (
    <label className="admin-checkbox">
      <input
        checked={Boolean(field.value)}
        onChange={(event) => {
          field.onChange(event.currentTarget.checked);
        }}
        ref={field.ref}
        type="checkbox"
      />
      <span>{label}</span>
    </label>
  );
}
