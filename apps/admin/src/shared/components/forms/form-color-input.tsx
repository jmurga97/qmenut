import { Field } from "@jmurga97/components";
import { useId } from "react";
import { useController, useFormContext } from "react-hook-form";

import { i18n } from "~/lib/i18n";

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
    <Field
      error={fieldState.error?.message}
      invalid={fieldState.invalid}
      label={label}
      optionalLabel={i18n.t("shared___Optional")}
    >
      <div className="admin-color-row">
        <input
          aria-label={i18n.t("shared___{{label}}: selector", { label })}
          onChange={(event) => field.onChange(event.currentTarget.value)}
          type={"color"}
          value={value}
        />
        <input
          aria-label={label}
          id={inputId}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(event.currentTarget.value)}
          ref={field.ref}
          type={"text"}
          value={value}
        />
      </div>
    </Field>
  );
}
