import { FormProvider } from "react-hook-form";

import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { BranchAddressAutocomplete } from "../components/branch-address-autocomplete";
import { useBranchController } from "../hooks/use-branch-controller";
import { DAYS, TIMEZONE_OPTIONS } from "../types";

import type { BranchFormValues } from "../types";

export function BranchPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="No hay ninguna sucursal disponible." />;
  return <BranchForm branchId={branch.id} key={branch.id} />;
}
function BranchForm({ branchId }: { branchId: string }) {
  const canWrite = useCan("branch.write");
  const controller = useBranchController(branchId);
  return (
    <div className="admin-page">
      <PageHeader kicker="Sucursal" title={controller.settings.name} />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.pending}
          error={controller.feedback.error}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
          success={controller.feedback.success}
        >
          <div className="admin-form-grid">
            <FormTextInput<BranchFormValues> label="Nombre" name="name" />
            <BranchAddressAutocomplete branchId={branchId} />
            <FormTextInput<BranchFormValues> label="Teléfono" name="phone" />
            <FormTextInput<BranchFormValues> label="WhatsApp" name="whatsapp" />
            <FormTextInput<BranchFormValues> label="URL del logo (icono de la app)" name="logoUrl" />
            <FormSelect<BranchFormValues>
              label="Zona horaria del restaurante"
              name="timezone"
              options={TIMEZONE_OPTIONS}
            />
          </div>
          <section className="admin-editor-section">
            <div className="admin-kicker">Horario semanal</div>
            <div className="admin-schedule-grid">
              {controller.fields.map((field, index) => (
                <div className="admin-schedule-row" key={field.id}>
                  <FormCheckbox<BranchFormValues>
                    label={DAYS[index] ?? String(field.dayOfWeek)}
                    name={`schedules.${index}.enabled`}
                  />
                  {(["open", "close"] as const).map((name) => (
                    <FormTextInput<BranchFormValues>
                      disabled={!controller.schedules[index]?.enabled}
                      key={name}
                      label={`${name === "open" ? "Apertura" : "Cierre"} ${DAYS[index]}`}
                      name={`schedules.${index}.${name}`}
                      type="time"
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
          <section className="admin-editor-section">
            <div className="admin-kicker">Datos legales del titular</div>
            <div className="admin-form-grid">
              <FormTextInput<BranchFormValues> label="Razón social" name="legalName" />
              <FormTextInput<BranchFormValues> label="NIF/CIF" name="taxId" />
              <FormTextInput<BranchFormValues> label="Domicilio fiscal" name="legalAddress" />
              <FormTextInput<BranchFormValues>
                inputMode="email"
                label="Email de protección de datos"
                name="dataProtectionEmail"
                type="email"
              />
            </div>
            <p>
              Estos datos aparecen en el aviso legal y la política de privacidad públicos; complétalos antes de
              publicar.
            </p>
          </section>
        </FormShell>
      </FormProvider>
    </div>
  );
}
