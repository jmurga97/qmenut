import { i18n } from "~/lib/i18n";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";

import type { BranchFormValues } from "../types";

export function LegalSection() {
  return (
    <section className="admin-editor-section">
      <h2 className={"ming-section__title"}>{i18n.t("branch___Datos legales del titular")}</h2>
      <div className="admin-form-grid">
        <FormTextInput<BranchFormValues> label={i18n.t("branch___Razón social")} name={"legalName"} />
        <FormTextInput<BranchFormValues> label={i18n.t("branch___NIF/CIF")} name={"taxId"} />
        <FormTextInput<BranchFormValues>
          inputMode={"email"}
          label={i18n.t("branch___Email de protección de datos")}
          name={"dataProtectionEmail"}
          type={"email"}
        />
      </div>
      <p>
        {i18n.t(
          "branch___Estos datos aparecen en el aviso legal y la política de privacidad públicos; complétalos antes de publicar. El domicilio fiscal es la dirección de la sucursal que defines en la pestaña General.",
        )}
      </p>
    </section>
  );
}
