import { Field, Input } from "@jmurga97/components";
import { useFormContext } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { formatPhone } from "~/shared/lib/phone-formatter";

import type { CountryCode } from "libphonenumber-js";
import type { FieldPath, FieldValues } from "react-hook-form";

type FormPhoneInputProps<TValues extends FieldValues> = {
  // ponytail: no per-restaurant country yet, hardcode ES until that lands on the restaurant settings
  country?: CountryCode;
  disabled?: boolean;
  label: string;
  name: FieldPath<TValues>;
  placeholder?: string;
};
export function FormPhoneInput<TValues extends FieldValues>({
  country = "ES",
  disabled = false,
  label,
  name,
  placeholder,
}: FormPhoneInputProps<TValues>) {
  // form.reset() drops registered refs; register() must run on every render to re-attach them.
  "use no memo";
  const { formState, getFieldState, register } = useFormContext<TValues>();
  const error = getFieldState(name, formState).error?.message;
  const { onChange, ...field } = register(name);
  return (
    <Field error={error} invalid={Boolean(error)} label={label} optionalLabel={i18n.t("shared___Optional")}>
      <Input
        {...field}
        autoComplete={"tel"}
        disabled={disabled}
        inputMode={"tel"}
        onChange={(event) => {
          event.target.value = formatPhone(event.target.value, country);
          void onChange(event);
        }}
        placeholder={placeholder}
        type={"tel"}
      />
    </Field>
  );
}
