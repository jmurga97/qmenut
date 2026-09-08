import { Field, Select } from "@jmurga97/components";
import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type SelectOption = {
  disabled?: boolean;
  id: string;
  label: string;
};
type FormSelectProps<TValues extends FieldValues> = {
  disabled?: boolean;
  label: string;
  name: FieldPath<TValues>;
  options: SelectOption[];
  portalContainer?: HTMLElement | null;
};
export function FormSelect<TValues extends FieldValues>({
  disabled,
  label,
  name,
  options,
  portalContainer,
}: FormSelectProps<TValues>) {
  const { control, formState, getFieldState } = useFormContext<TValues>();
  const { field } = useController({ control, name });
  const error = getFieldState(name, formState).error?.message;
  return (
    <Field error={error} invalid={Boolean(error)} label={label}>
      <Select
        disabled={disabled}
        name={field.name}
        onValueChange={(value) => field.onChange(value ?? "")}
        options={options}
        portalContainer={portalContainer}
        placeholder="Selecciona…"
        value={field.value ? String(field.value) : null}
      />
    </Field>
  );
}
