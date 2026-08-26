import { Checkbox } from "@jmurga97/components";
import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type FormCheckboxProps<TValues extends FieldValues> = {
  disabled?: boolean;
  label: string;
  name: FieldPath<TValues>;
};
export function FormCheckbox<TValues extends FieldValues>({ disabled, label, name }: FormCheckboxProps<TValues>) {
  const { control } = useFormContext<TValues>();
  const { field } = useController({ control, name });
  return (
    <div className="admin-form-checkbox">
      <Checkbox
        checked={Boolean(field.value)}
        disabled={disabled}
        label={label}
        onCheckedChange={(checked) => field.onChange(checked)}
      />
    </div>
  );
}
