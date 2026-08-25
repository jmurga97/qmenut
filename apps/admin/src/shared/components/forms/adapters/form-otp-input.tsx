import { OTPField } from "@base-ui/react/otp-field";
import { Field } from "@ming/components";
import { useFormContext, useWatch } from "react-hook-form";

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
  const { control, formState, getFieldState, setValue } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  const value = useWatch({ control, name });
  return (
    <Field error={error} invalid={Boolean(error)} label={label}>
      <OTPField.Root
        className="admin-otp-field"
        disabled={disabled}
        inputMode="numeric"
        length={length}
        name={name}
        validationType="numeric"
        value={typeof value === "string" ? value : ""}
        onValueChange={(next: string) => {
          setValue(name, next as never, { shouldDirty: true, shouldValidate: true });
        }}
      >
        <div className="admin-otp-field__slots">
          {Array.from({ length }, (_, index) => (
            <OTPField.Input key={index} className="admin-otp-field__slot" />
          ))}
        </div>
      </OTPField.Root>
    </Field>
  );
}
