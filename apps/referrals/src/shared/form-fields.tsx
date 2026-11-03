import { Field, Input } from "@jmurga97/components";
import { useFormContext } from "react-hook-form";

import type { InputProps } from "@jmurga97/components";
import type { FieldValues, Path } from "react-hook-form";

type TextFieldProps<Values extends FieldValues> = Omit<InputProps, "name"> & {
  name: Path<Values>;
  label: string;
  hint?: string;
  optional?: boolean;
};

/** Ming Field + Input bound to the surrounding react-hook-form context. */
export function TextField<Values extends FieldValues>({
  name,
  label,
  hint,
  optional,
  ...input
}: TextFieldProps<Values>) {
  "use no memo";
  const { formState, getFieldState, register } = useFormContext<Values>();
  const error = getFieldState(name, formState).error?.message;

  return (
    <Field
      error={error}
      hint={hint}
      invalid={Boolean(error)}
      label={label}
      optional={optional}
      optionalLabel="Opcional"
    >
      <Input {...input} {...register(name)} />
    </Field>
  );
}

/** Restaurant introduction fields, nested under `restaurant` in the join and add-referral forms. */
export function RestaurantFields<Values extends FieldValues>({ prefix }: { prefix: string }) {
  const field = (name: string) => `${prefix}${name}` as Path<Values>;

  return (
    <>
      <TextField<Values>
        autoComplete="organization"
        label="Nombre del restaurante"
        maxLength={120}
        name={field("restaurantName")}
      />
      <TextField<Values> autoComplete="off" label="Persona de contacto" maxLength={120} name={field("contactName")} />
      <TextField<Values>
        autoComplete="off"
        hint="Celular o teléfono fijo."
        inputMode="tel"
        label="Teléfono del restaurante"
        name={field("contactPhone")}
        type="tel"
      />
      <TextField<Values>
        autoComplete="off"
        label="Correo del restaurante"
        name={field("contactEmail")}
        optional
        type="email"
      />
      <TextField<Values> autoComplete="off" label="Ciudad" maxLength={80} name={field("city")} optional />
      <TextField<Values>
        autoComplete="off"
        inputMode="url"
        label="Web o Instagram"
        maxLength={200}
        name={field("website")}
        optional
      />
    </>
  );
}
