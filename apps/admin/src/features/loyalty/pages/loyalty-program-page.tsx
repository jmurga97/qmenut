import { Button, ConfirmAction, DropdownMenu } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { QmLoyaltyCard } from "@qmenut/ui/components/qm-loyalty-card/react";
import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { Suspense } from "react";
import { FormProvider, useWatch } from "react-hook-form";

import { DishSelect } from "~/features/loyalty/components/dish-select";
import { useLoyaltyProgramController } from "~/features/loyalty/hooks/use-loyalty-program-controller";
import { i18n } from "~/lib/i18n";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormActions } from "~/shared/components/forms/form-actions";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import type { CSSProperties } from "react";
import type { LoyaltyProgramFormValues, RewardType } from "~/features/loyalty/types";

const TYPE_LABELS: Record<RewardType, string> = {
  free_dish: i18n.t("loyalty___Plato gratis"),
  percentage_discount: i18n.t("loyalty___Descuento porcentual"),
  special_price: i18n.t("loyalty___Precio especial"),
};
const TYPE_OPTIONS = Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }));
type ProgramController = ReturnType<typeof useLoyaltyProgramController>;
export function LoyaltyProgramPage() {
  const branch = useSelectedBranch();
  if (!branch)
    return <NoBranchState description={i18n.t("loyalty___Crea una sucursal antes de configurar la fidelización.")} />;
  return (
    <Suspense
      fallback={
        <div className={"loyalty-program-layout"}>
          <div className={"loyalty-program-main"}>
            <CardSkeleton rows={2} title={i18n.t("loyalty___Configuración")} />
            <CardSkeleton title={i18n.t("loyalty___Premios")} />
          </div>
        </div>
      }
    >
      <LoyaltyProgramContent branchId={branch.id} key={branch.id} />
    </Suspense>
  );
}
function LoyaltyProgramContent({ branchId }: { branchId: string }) {
  const loyalty = useLoyaltyProgramController(branchId);
  useEditorGuard({
    dirty: loyalty.form.formState.isDirty,
    pending: loyalty.rewardBusy || loyalty.saveProgramBusy,
  });
  const themeVars = buildQmThemeVars(resolveTenantThemeConfig(loyalty.theme)) as CSSProperties;
  return (
    <FormProvider {...loyalty.form}>
      <div className={"loyalty-program-layout"}>
        <div className={"loyalty-program-main"}>
          <fieldset className={"admin-card loyalty-program-settings"} aria-labelledby={"program-settings-title"}>
            <h2 id={"program-settings-title"}>{i18n.t("loyalty___Configuración")}</h2>
            <FormCheckbox<LoyaltyProgramFormValues> label={i18n.t("loyalty___Programa activo")} name={"isActive"} />
            <FormTextInput<LoyaltyProgramFormValues>
              inputMode={"decimal"}
              label={i18n.t("loyalty___Ticket medio")}
              name={"averageTicket"}
            />
            <FormActions
              busy={loyalty.saveProgramBusy}
              onSubmit={() => void loyalty.saveProgram()}
              submitLabel={i18n.t("loyalty___Guardar configuración")}
            />
          </fieldset>
          <EntityListCard
            action={
              <Button
                disabled={loyalty.rewardBusy || loyalty.editingIndex !== null}
                onClick={() => loyalty.newReward()}
                variant={"primary"}
              >
                {i18n.t("loyalty___Nuevo premio")}
              </Button>
            }
            count={loyalty.rewards.fields.length}
            emptyText={i18n.t("loyalty___Crea el primer premio para que los sellos tengan una meta.")}
            title={i18n.t("loyalty___Premios")}
          >
            {loyalty.rewards.fields.map((field, index) => (
              <RewardRow index={index} key={field.id} loyalty={loyalty} />
            ))}
          </EntityListCard>
        </div>
        <aside className={"loyalty-preview-column loyalty-card-preview"} style={themeVars}>
          <div className="admin-kicker">
            {i18n.t("loyalty___Vista del cliente ·")} {loyalty.selectedBranch?.name}
          </div>
          <QmLoyaltyCard
            restaurantName={loyalty.restaurantName}
            email={i18n.t("loyalty___cliente@ejemplo.com")}
            balance={loyalty.previewBalance}
            target={loyalty.target}
            progressLabel={i18n.t("loyalty___Tu tarjeta")}
            gridLabel={i18n.t("loyalty___{{balance}} de {{target}} sellos", {
              balance: loyalty.previewBalance,
              target: loyalty.target,
            })}
            stampLabel={i18n.t("loyalty___Pedir mi sello")}
          >
            {loyalty.activeRewards.map((reward) => (
              <p key={reward.id} slot={"rewards"}>
                {reward.name} · {reward.cost} {i18n.t("loyalty___sellos")}
              </p>
            ))}
          </QmLoyaltyCard>
        </aside>
      </div>
      <DeleteRewardConfirm loyalty={loyalty} />
    </FormProvider>
  );
}
function DeleteRewardConfirm({ loyalty }: { loyalty: ProgramController }) {
  if (loyalty.deletingIndex === null) return null;
  return (
    <ConfirmAction
      cancelLabel={i18n.t("loyalty___Cancelar")}
      confirmLabel={i18n.t("loyalty___Eliminar")}
      message={i18n.t("loyalty___Se eliminará “{{name}}”. Esta acción no se puede deshacer.", {
        name: loyalty.deletingRewardName ?? i18n.t("loyalty___este premio"),
      })}
      onCancel={loyalty.cancelDeleteReward}
      onConfirm={loyalty.confirmDeleteReward}
      onOpenChange={(open) => {
        if (open) return;
        loyalty.cancelDeleteReward();
      }}
      open
      pending={loyalty.rewardBusy}
      title={i18n.t("loyalty___Eliminar premio")}
    />
  );
}
function RewardRow({ index, loyalty }: { index: number; loyalty: ProgramController }) {
  const reward = useWatch({ control: loyalty.form.control, name: `rewards.${index}` });
  const editing = loyalty.editingIndex === index;
  if (!editing)
    return (
      <li className={"loyalty-reward-admin-row"}>
        <div>
          <strong>{reward.name}</strong>
          <p>
            {TYPE_LABELS[reward.type]} · {reward.cost} {i18n.t("loyalty___sellos ·")}{" "}
            {reward.isActive ? i18n.t("loyalty___activo") : i18n.t("loyalty___inactivo")}
          </p>
        </div>
        <DropdownMenu
          align={"end"}
          ariaLabel={i18n.t("loyalty___Acciones para {{name}}", { name: reward.name })}
          className={buttonVariants({ size: "sm", variant: "secondary" })}
          disabled={loyalty.rewardBusy}
          items={[
            {
              id: "edit",
              label: <>{i18n.t("loyalty___Editar")}</>,
              onSelect: () => loyalty.rewardAction(index, "edit"),
              textValue: i18n.t("loyalty___Editar"),
            },
            {
              id: "toggle",
              label: reward.isActive ? i18n.t("loyalty___Desactivar") : i18n.t("loyalty___Activar"),
              onSelect: () => loyalty.rewardAction(index, "toggle"),
            },
            {
              id: "delete",
              label: <>{i18n.t("loyalty___Eliminar")}</>,
              textValue: i18n.t("loyalty___Eliminar"),
              onSelect: () => loyalty.rewardAction(index, "delete"),
              separatorBefore: true,
              tone: "destructive",
            },
          ]}
          trigger={i18n.t("loyalty___Acciones")}
        />
      </li>
    );
  const field = (name: keyof typeof reward) => `rewards.${index}.${name}` as const;
  return (
    <li className={"admin-card loyalty-reward-editor"}>
      <div className="admin-kicker">
        {reward.rewardId ? i18n.t("loyalty___Editar premio") : i18n.t("loyalty___Nuevo premio")}
      </div>
      <div className="admin-editor-fields">
        <section className="admin-editor-section">
          <h3 className={"ming-section__title"}>{i18n.t("loyalty___Premio")}</h3>
          <FormTextInput<LoyaltyProgramFormValues>
            label={i18n.t("loyalty___Nombre")}
            maxLength={200}
            name={field("name")}
          />
          <FormTextarea<LoyaltyProgramFormValues>
            label={i18n.t("loyalty___Descripción")}
            name={field("description")}
            rows={3}
          />
          <FormCheckbox<LoyaltyProgramFormValues> label={i18n.t("loyalty___Premio activo")} name={field("isActive")} />
        </section>
        <section className="admin-editor-section">
          <h3 className={"ming-section__title"}>{i18n.t("loyalty___Canje")}</h3>
          <div className="admin-form-grid--two">
            <FormSelect<LoyaltyProgramFormValues>
              label={i18n.t("loyalty___Tipo")}
              name={field("type")}
              options={TYPE_OPTIONS}
            />
            <FormTextInput<LoyaltyProgramFormValues>
              inputMode={"numeric"}
              label={i18n.t("loyalty___Coste en sellos")}
              name={field("cost")}
              type={"number"}
            />
            {reward.type === "percentage_discount" ? (
              <FormTextInput<LoyaltyProgramFormValues>
                inputMode={"numeric"}
                label={i18n.t("loyalty___Descuento (%)")}
                name={field("percentage")}
                type={"number"}
              />
            ) : (
              <DishSelect
                groups={loyalty.dishGroups}
                label={i18n.t("loyalty___Plato · todas las sucursales")}
                name={`rewards.${index}.freeDishId`}
              />
            )}
            {reward.type === "special_price" ? (
              <FormTextInput<LoyaltyProgramFormValues>
                inputMode={"decimal"}
                label={i18n.t("loyalty___Precio especial")}
                name={field("specialPrice")}
              />
            ) : null}
          </div>
        </section>
      </div>
      <FormActions
        busy={loyalty.rewardBusy}
        onCancel={() => loyalty.cancelReward(index)}
        onSubmit={() => void loyalty.saveReward(index)}
        submitLabel={i18n.t("loyalty___Guardar premio")}
      />
    </li>
  );
}
