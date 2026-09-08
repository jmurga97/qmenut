import { Button, InlineMessage } from "@jmurga97/components";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";

import { SocialIcon } from "./social-icon";

import type { BranchFormValues } from "../types";

export function SocialLinksEditor() {
  const { control, formState } = useFormContext<BranchFormValues>();
  const { append, fields, remove } = useFieldArray({ control, name: "socials" });
  const socials = useWatch({ control, name: "socials" });
  const error = formState.errors.socials?.root?.message;
  return (
    <section className="admin-editor-section">
      <div className="admin-kicker">Redes sociales</div>
      <div className="admin-social-links">
        {fields.map((field, index) => (
          <div className="admin-social-row" key={field.id}>
            <SocialIcon href={socials[index]?.url ?? ""} />
            <FormTextInput<BranchFormValues>
              inputMode="url"
              label="Red social"
              name={`socials.${index}.url`}
              placeholder="https://instagram.com/tucuenta"
            />
            <Button
              aria-label={`Quitar red social ${index + 1}`}
              size="sm"
              type="button"
              variant="ghost"
              onClick={() => remove(index)}
            >
              Quitar
            </Button>
          </div>
        ))}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      </div>
      <Button
        disabled={fields.length >= 10}
        size="sm"
        type="button"
        variant="secondary"
        onClick={() => append({ url: "" })}
      >
        Agregar red social
      </Button>
      <p className="admin-field-hint">
        Se muestran como iconos en la página de contacto del menú público. El icono se detecta a partir del enlace.
      </p>
    </section>
  );
}
