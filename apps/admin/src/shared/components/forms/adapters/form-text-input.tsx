import { Field, Input } from "@jmurga97/components";
import { useFormContext } from "react-hook-form";

import type { HTMLInputTypeAttribute } from "react";
import type { FieldPath, FieldValues } from "react-hook-form";

type FormTextInputProps<TValues extends FieldValues> = {
  autocomplete?: string;
  disabled?: boolean;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  maxLength?: number;
  name: FieldPath<TValues>;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
};
export function FormTextInput<TValues extends FieldValues>({
  autocomplete,
  disabled = false,
  inputMode,
  label,
  maxLength,
  name,
  placeholder,
  type = "text",
}: FormTextInputProps<TValues>) {
  const { formState, getFieldState, register } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  return (
    <Field error={error} invalid={Boolean(error)} label={label}>
      <Input
        {...register(name)}
        autoComplete={autocomplete}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        type={type}
      />
    </Field>
  );
}
