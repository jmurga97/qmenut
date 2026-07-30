import { useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type FormCheckboxProps<TValues extends FieldValues> = {
  disabled?: boolean;
  label: string;
  name: FieldPath<TValues>;
};
export function FormCheckbox<TValues extends FieldValues>({ disabled, label, name }: FormCheckboxProps<TValues>) {
  const { register } = useFormContext<TValues>();
  return (
    <label className="admin-checkbox">
      <input {...register(name)} disabled={disabled} type="checkbox" />
      <span>{label}</span>
    </label>
  );
}
