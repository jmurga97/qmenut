import { Button, ConfirmAction, DropdownMenu } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { QmLoyaltyCard } from "@qmenut/ui/components/qm-loyalty-card/react";
import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { FormProvider, useWatch } from "react-hook-form";

import { useLoyaltyProgramController } from "~/features/loyalty/hooks/use-loyalty-program-controller";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormActions } from "~/shared/components/forms/form-actions";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { CSSProperties } from "react";
import type { LoyaltyProgramFormValues, RewardType } from "~/features/loyalty/types";

const TYPE_LABELS: Record<RewardType, string> = {
  free_dish: "Plato gratis",
  percentage_discount: "Descuento porcentual",
  special_price: "Precio especial",
};
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }));
type ProgramController = ReturnType<typeof useLoyaltyProgramController>;
export function LoyaltyProgramPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal antes de configurar la fidelización." />;
  return <LoyaltyProgramContent branchId={branch.id} key={branch.id} />;
}
function LoyaltyProgramContent({ branchId }: { branchId: string }) {
  const loyalty = useLoyaltyProgramController(branchId);
  const themeVars = buildQmThemeVars(resolveTenantThemeConfig(loyalty.theme)) as CSSProperties;
  return (
    <FormProvider {...loyalty.form}>
      <div className="admin-page admin-loyalty-page">
        <PageHeader kicker="Programa" title="Sellos y premios" />
        <div className="loyalty-program-layout">
          <div className="loyalty-program-main">
            <section className="admin-card loyalty-program-settings" aria-labelledby="program-settings-title">
              <div className="admin-toolbar">
                <h3 id="program-settings-title">Configuración</h3>
                <FormCheckbox<LoyaltyProgramFormValues> label="Programa activo" name="isActive" />
              </div>
              <FormTextInput<LoyaltyProgramFormValues>
                inputMode="decimal"
                label="Ticket medio (€)"
                name="ticketMedioEuros"
                type="number"
              />
              <FormActions
                busy={loyalty.saveProgramBusy}
                onSubmit={() => void loyalty.saveProgram()}
                submitLabel="Guardar configuración"
              />
            </section>
            <EntityListCard
              action={
                <Button
                  disabled={loyalty.rewardBusy || loyalty.editingIndex !== null}
                  onClick={loyalty.newReward}
                  variant="primary"
                >
                  + Nuevo premio
                </Button>
              }
              count={loyalty.rewards.fields.length}
              emptyText="Crea el primer premio para que los sellos tengan una meta."
              title="Premios"
            >
              {loyalty.rewards.fields.map((field, index) => (
                <RewardRow index={index} key={field.id} loyalty={loyalty} />
              ))}
            </EntityListCard>
            <FormFeedback error={loyalty.error} success={loyalty.success} />
          </div>
          <aside className="loyalty-preview-column loyalty-card-preview" style={themeVars}>
            <div className="admin-kicker">Vista del cliente · {loyalty.selectedBranch?.name}</div>
            <QmLoyaltyCard
              restaurantName={loyalty.restaurantName}
              email="cliente@ejemplo.com"
              balance={loyalty.previewBalance}
              target={loyalty.target}
              progressLabel="Tu tarjeta"
              gridLabel={`${loyalty.previewBalance} de ${loyalty.target} sellos`}
              stampLabel="Pedir mi sello"
            >
              {loyalty.activeRewards.map((reward) => (
                <p key={reward.id} slot="rewards">
                  {reward.name} · {reward.cost} sellos
                </p>
              ))}
            </QmLoyaltyCard>
          </aside>
        </div>
        <DeleteRewardConfirm loyalty={loyalty} />
      </div>
    </FormProvider>
  );
}
function DeleteRewardConfirm({ loyalty }: { loyalty: ProgramController }) {
  if (loyalty.deletingIndex === null) return null;
  return (
    <ConfirmAction
      cancelLabel="Cancelar"
      confirmLabel="Eliminar"
      message={`Se eliminará “${loyalty.deletingRewardName ?? "este premio"}”. Esta acción no se puede deshacer.`}
      onCancel={loyalty.cancelDeleteReward}
      onConfirm={loyalty.confirmDeleteReward}
      onOpenChange={(open) => {
        if (open) return;
        loyalty.cancelDeleteReward();
      }}
      open
      pending={loyalty.rewardBusy}
      title="Eliminar premio"
    />
  );
}
function RewardRow({ index, loyalty }: { index: number; loyalty: ProgramController }) {
  const reward = useWatch({ control: loyalty.form.control, name: `rewards.${index}` });
  const editing = loyalty.editingIndex === index;
  if (!editing)
    return (
      <li className="loyalty-reward-admin-row">
        <div>
          <strong>{reward.name}</strong>
          <p>
            {TYPE_LABELS[reward.type]} · {reward.cost} sellos · {reward.isActive ? "activo" : "inactivo"}
          </p>
        </div>
        <DropdownMenu
          align="end"
          ariaLabel={`Acciones para ${reward.name}`}
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          disabled={loyalty.rewardBusy}
          items={[
            { id: "edit", label: "Editar", onSelect: () => loyalty.rewardAction(index, "edit") },
            {
              id: "toggle",
              label: reward.isActive ? "Desactivar" : "Activar",
              onSelect: () => loyalty.rewardAction(index, "toggle"),
            },
            {
              id: "delete",
              label: "Eliminar",
              onSelect: () => loyalty.rewardAction(index, "delete"),
              separatorBefore: true,
              tone: "destructive",
            },
          ]}
          trigger="Acciones"
        />
      </li>
    );
  const field = (name: keyof typeof reward) => `rewards.${index}.${name}` as const;
  return (
    <li className="admin-card loyalty-reward-editor">
      <div className="admin-kicker">{reward.rewardId ? "Editar premio" : "Nuevo premio"}</div>
      <div className="admin-form-grid admin-form-grid--two">
        <FormTextInput<LoyaltyProgramFormValues> label="Nombre" maxLength={200} name={field("name")} />
        <FormTextInput<LoyaltyProgramFormValues>
          inputMode="numeric"
          label="Coste en sellos"
          name={field("cost")}
          type="number"
        />
        <FormSelect<LoyaltyProgramFormValues> label="Tipo" name={field("type")} options={TYPE_OPTIONS} />
        {reward.type === "percentage_discount" ? (
          <FormTextInput<LoyaltyProgramFormValues>
            inputMode="numeric"
            label="Descuento (%)"
            name={field("percentage")}
            type="number"
          />
        ) : (
          <FormSelect<LoyaltyProgramFormValues>
            label="Plato · todas las sucursales"
            name={field("freeDishId")}
            options={loyalty.dishes}
          />
        )}
        {reward.type === "special_price" ? (
          <FormTextInput<LoyaltyProgramFormValues>
            inputMode="decimal"
            label="Precio especial (€)"
            name={field("specialPriceEuros")}
            type="number"
          />
        ) : null}
      </div>
      <FormTextarea<LoyaltyProgramFormValues> label="Descripción" name={field("description")} rows={3} />
      <FormCheckbox<LoyaltyProgramFormValues> label="Premio activo" name={field("isActive")} />
      <FormActions
        busy={loyalty.rewardBusy}
        onCancel={() => loyalty.cancelReward(index)}
        onSubmit={() => void loyalty.saveReward(index)}
        submitLabel="Guardar premio"
      />
    </li>
  );
}
