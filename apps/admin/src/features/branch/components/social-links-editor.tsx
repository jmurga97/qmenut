import { Button, InlineMessage } from "@jmurga97/components";
import { useFieldArray, useFormContext } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";

import type { BranchFormValues } from "../types";

export function SocialLinksEditor() {
  const { control, formState } = useFormContext<BranchFormValues>();
  const { append, fields, remove } = useFieldArray({ control, name: "socials" });
  const error = formState.errors.socials?.root?.message;
  return (
    <section className="admin-editor-section">
      <h2 className={"ming-section__title"}>{i18n.t("branch___Redes sociales")}</h2>
      <div className="admin-social-links">
        {fields.map((field, index) => (
          <div className="admin-social-row" key={field.id}>
            <FormTextInput<BranchFormValues>
              inputMode={"url"}
              label={i18n.t("branch___Red social")}
              name={`socials.${index}.url`}
              placeholder={i18n.t("branch___https://instagram.com/tucuenta")}
            />
            <Button
              aria-label={i18n.t("branch___Quitar red social {{index}}", { index: index + 1 })}
              size={"sm"}
              type={"button"}
              variant={"ghost"}
              onClick={() => remove(index)}
            >
              {i18n.t("branch___Quitar")}
            </Button>
          </div>
        ))}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      </div>
      <Button
        disabled={fields.length >= 10}
        size={"sm"}
        type={"button"}
        variant={"secondary"}
        onClick={() => append({ url: "" })}
      >
        {i18n.t("branch___Agregar red social")}
      </Button>
      <p className="admin-field-hint">
        {i18n.t(
          "branch___Se muestran como iconos en la página de contacto del menú público. El icono se detecta a partir del enlace.",
        )}
      </p>
    </section>
  );
}
