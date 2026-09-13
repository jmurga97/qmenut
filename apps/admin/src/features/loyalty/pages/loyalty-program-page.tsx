import { Button, ConfirmAction, DropdownMenu } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { QmLoyaltyCard } from "@qmenut/ui/components/qm-loyalty-card/react";
import { buildQmThemeVars } from "@qmenut/ui/theme/apply-theme";
import { resolveTenantThemeConfig } from "@qmenut/ui/theme/tenant-theme-config";
import { useEffect } from "react";
import { FormProvider, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { useLoyaltyProgramController } from "~/features/loyalty/hooks/use-loyalty-program-controller";
import { notifyError } from "~/lib/notifications";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormActions } from "~/shared/components/forms/form-actions";
import { Icon } from "~/shared/components/icon";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { useTranslationForm } from "~/shared/hooks/use-translation-form";

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
  const language = useSelectedLanguage();
  if (!branch) return <NoBranchState description="Crea una sucursal antes de configurar la fidelización." />;
  if (!language.isDefault && language.languageCode)
    return (
      <TranslatedLoyaltyProgram
        branchId={branch.id}
        languageCode={language.languageCode}
        key={`${branch.id}:${language.languageCode}`}
      />
    );
  return <LoyaltyProgramContent branchId={branch.id} key={branch.id} />;
}
function TranslatedLoyaltyProgram({ branchId, languageCode }: { branchId: string; languageCode: string }) {
  const translation = useTranslationForm({ branchId, languageCode });
  return <LoyaltyProgramContent branchId={branchId} translation={translation} />;
}
type Translation = ReturnType<typeof useTranslationForm>;
function LoyaltyProgramContent({ branchId, translation }: { branchId: string; translation?: Translation }) {
  const loyalty = useLoyaltyProgramController(branchId);
  useEffect(() => {
    if (!translation || loyalty.form.formState.isDirty) return;
    const values = loyalty.form.getValues();
    loyalty.form.reset({
      ...values,
      rewards: values.rewards.map((reward) => ({
        ...reward,
        name: translation.value({
          entityType: "reward",
          entityId: reward.rewardId ?? "",
          field: "name",
          fallback: reward.name,
        }),
        description: translation.value({
          entityType: "reward",
          entityId: reward.rewardId ?? "",
          field: "description",
          fallback: reward.description,
        }),
      })),
    });
  }, [loyalty.form, translation]);
  useEditorGuard({
    dirty: loyalty.form.formState.isDirty,
    pending: loyalty.rewardBusy || loyalty.saveProgramBusy || Boolean(translation?.pending),
  });
  const themeVars = buildQmThemeVars(resolveTenantThemeConfig(loyalty.theme)) as CSSProperties;
  return (
    <FormProvider {...loyalty.form}>
      <div className="admin-page admin-loyalty-page">
        <PageHeader kicker="Programa" title="Sellos y premios" />
        <div className="loyalty-program-layout">
          <div className="loyalty-program-main">
            <fieldset
              disabled={Boolean(translation)}
              className="admin-card loyalty-program-settings"
              aria-labelledby="program-settings-title"
            >
              <div className="admin-toolbar">
                <h3 id="program-settings-title">Configuración</h3>
                <FormCheckbox<LoyaltyProgramFormValues> label="Programa activo" name="isActive" />
              </div>
              <FormTextInput<LoyaltyProgramFormValues> inputMode="decimal" label="Ticket medio" name="averageTicket" />
              <FormActions
                busy={loyalty.saveProgramBusy}
                onSubmit={() => {
                  if (!translation) void loyalty.saveProgram();
                }}
                submitLabel="Guardar configuración"
              />
            </fieldset>
            {translation ? <p>Cambia al idioma base para crear premios o cambiar la configuración.</p> : null}
            <EntityListCard
              action={
                <Button
                  disabled={Boolean(translation) || loyalty.rewardBusy || loyalty.editingIndex !== null}
                  onClick={() => {
                    if (!translation) loyalty.newReward();
                  }}
                  variant="primary"
                >
                  <Icon name="plus" /> Nuevo premio
                </Button>
              }
              count={loyalty.rewards.fields.length}
              emptyText="Crea el primer premio para que los sellos tengan una meta."
              title="Premios"
            >
              {loyalty.rewards.fields.map((field, index) => (
                <RewardRow index={index} key={field.id} loyalty={loyalty} translation={translation} />
              ))}
            </EntityListCard>
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
                  {translation?.value({
                    entityType: "reward",
                    entityId: reward.id,
                    field: "name",
                    fallback: reward.name,
                  }) ?? reward.name}{" "}
                  · {reward.cost} sellos
                </p>
              ))}
            </QmLoyaltyCard>
          </aside>
        </div>
        {translation ? null : <DeleteRewardConfirm loyalty={loyalty} />}
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
function RewardRow({
  index,
  loyalty,
  translation,
}: {
  index: number;
  loyalty: ProgramController;
  translation?: Translation;
}) {
  const canTranslate = useCan("languages.write");
  const reward = useWatch({ control: loyalty.form.control, name: `rewards.${index}` });
  const editing = Boolean(translation) || loyalty.editingIndex === index;
  async function saveTranslation() {
    if (!translation || !canTranslate || !reward.rewardId) return;
    if (!(await loyalty.form.trigger([`rewards.${index}.name`, `rewards.${index}.description`]))) return;
    const rows = (["name", "description"] as const).flatMap((field) => {
      const row = translation.saveRow({
        entityType: "reward",
        entityId: reward.rewardId!,
        field,
        value: reward[field],
      });
      return row ? [row] : [];
    });
    if (rows.length === 0) return;
    try {
      await translation.saveRows(rows);
      loyalty.form.resetField(`rewards.${index}.name`, { defaultValue: reward.name });
      loyalty.form.resetField(`rewards.${index}.description`, { defaultValue: reward.description });
      toast.success("Traducción guardada.");
    } catch (error) {
      notifyError(error);
    }
  }
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
            {
              id: "edit",
              label: (
                <>
                  <Icon name="edit" /> Editar
                </>
              ),
              onSelect: () => loyalty.rewardAction(index, "edit"),
              textValue: "Editar",
            },
            {
              id: "toggle",
              label: reward.isActive ? "Desactivar" : "Activar",
              onSelect: () => loyalty.rewardAction(index, "toggle"),
            },
            {
              id: "delete",
              label: (
                <>
                  <Icon name="trash" /> Eliminar
                </>
              ),
              textValue: "Eliminar",
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
        <FormTextInput<LoyaltyProgramFormValues>
          disabled={Boolean(translation) && (!canTranslate || translation?.pending)}
          label="Nombre"
          maxLength={200}
          name={field("name")}
        />
        <FormTextInput<LoyaltyProgramFormValues>
          disabled={Boolean(translation)}
          inputMode="numeric"
          label="Coste en sellos"
          name={field("cost")}
          type="number"
        />
        <FormSelect<LoyaltyProgramFormValues>
          disabled={Boolean(translation)}
          label="Tipo"
          name={field("type")}
          options={TYPE_OPTIONS}
        />
        {reward.type === "percentage_discount" ? (
          <FormTextInput<LoyaltyProgramFormValues>
            disabled={Boolean(translation)}
            inputMode="numeric"
            label="Descuento (%)"
            name={field("percentage")}
            type="number"
          />
        ) : (
          <FormSelect<LoyaltyProgramFormValues>
            disabled={Boolean(translation)}
            label="Plato · todas las sucursales"
            name={field("freeDishId")}
            options={loyalty.dishes}
          />
        )}
        {reward.type === "special_price" ? (
          <FormTextInput<LoyaltyProgramFormValues>
            disabled={Boolean(translation)}
            inputMode="decimal"
            label="Precio especial"
            name={field("specialPrice")}
          />
        ) : null}
      </div>
      <FormTextarea<LoyaltyProgramFormValues>
        disabled={Boolean(translation) && (!canTranslate || translation?.pending)}
        label="Descripción"
        name={field("description")}
        rows={3}
      />
      <FormCheckbox<LoyaltyProgramFormValues>
        disabled={Boolean(translation)}
        label="Premio activo"
        name={field("isActive")}
      />
      <FormActions
        busy={loyalty.rewardBusy || translation?.pending}
        onCancel={translation ? undefined : () => loyalty.cancelReward(index)}
        onSubmit={() => {
          if (translation) void saveTranslation();
          else void loyalty.saveReward(index);
        }}
        submitLabel={translation ? "Guardar traducción" : "Guardar premio"}
      />
    </li>
  );
}
