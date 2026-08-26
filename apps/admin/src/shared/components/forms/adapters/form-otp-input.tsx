import { OTPField } from "@base-ui/react/otp-field";
import { Field } from "@jmurga97/components";
import { useController, useFormContext } from "react-hook-form";

import type { FieldPath, FieldValues } from "react-hook-form";

type FormOtpInputProps<TValues extends FieldValues> = {
  disabled?: boolean;
  label: string;
  length: number;
  name: FieldPath<TValues>;
};

export function FormOtpInput<TValues extends FieldValues>({
  disabled = false,
  label,
  length,
  name,
}: FormOtpInputProps<TValues>) {
  const { control } = useFormContext<TValues>();
  const { field, fieldState } = useController({ control, name });
  const error = fieldState.error?.message;
  return (
    <Field error={error} invalid={Boolean(error)} label={label}>
      <OTPField.Root
        className="admin-otp-field"
        disabled={disabled}
        inputMode="numeric"
        length={length}
        name={field.name}
        validationType="numeric"
        value={typeof field.value === "string" ? field.value : ""}
        onValueChange={(next: string) => {
          field.onChange(next);
        }}
      >
        <div className="admin-otp-field__slots">
          {Array.from({ length }, (_, index) => (
            <OTPField.Input key={index} className="admin-otp-field__slot" onBlur={field.onBlur} />
          ))}
        </div>
      </OTPField.Root>
    </Field>
  );
}
