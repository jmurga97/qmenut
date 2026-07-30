import { useId } from "react";
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
  const inputId = useId();
  const { formState, getFieldState, register } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  return (
    <label className="admin-field" htmlFor={inputId}>
      <span>{label}</span>
      <input
        {...register(name)}
        aria-invalid={Boolean(error)}
        autoComplete={autocomplete}
        id={inputId}
        inputMode={inputMode}
        maxLength={maxLength}
        placeholder={placeholder}
        readOnly={disabled}
        type={type}
      />
      {error ? <small role="alert">{error}</small> : null}
    </label>
  );
}
