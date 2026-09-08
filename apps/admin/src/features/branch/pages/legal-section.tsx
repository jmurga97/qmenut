import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";

import type { BranchFormValues } from "../types";

export function LegalSection() {
  return (
    <section className="admin-editor-section">
      <div className="admin-kicker">Datos legales del titular</div>
      <div className="admin-form-grid">
        <FormTextInput<BranchFormValues> label="Razón social" name="legalName" />
        <FormTextInput<BranchFormValues> label="NIF/CIF" name="taxId" />
        <FormTextInput<BranchFormValues>
          inputMode="email"
          label="Email de protección de datos"
          name="dataProtectionEmail"
          type="email"
        />
      </div>
      <p>
        Estos datos aparecen en el aviso legal y la política de privacidad públicos; complétalos antes de publicar. El
        domicilio fiscal es la dirección de la sucursal que defines en la pestaña General.
      </p>
    </section>
  );
}
