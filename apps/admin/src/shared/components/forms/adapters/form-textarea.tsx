import { Field, Textarea } from "@jmurga97/components";
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
  const { formState, getFieldState, register } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  return (
    <Field error={error} invalid={Boolean(error)} label={label}>
      <Textarea {...register(name)} disabled={disabled} rows={rows} />
    </Field>
  );
}
