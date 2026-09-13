import { Button, InlineMessage } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormShell } from "~/shared/components/forms/form-shell";
import { Icon } from "~/shared/components/icon";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { TranslationEditor } from "~/shared/components/translation-editor";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { useTranslationForm } from "~/shared/hooks/use-translation-form";

import { getPromotionQueryOptions } from "../api";
import { usePromotionEditorController, usePromotionsListController } from "../hooks/use-promotions-controller";
import { toPromotionFormValues } from "../mappers";
import { isEditablePromotion } from "../types";

import type { EditablePromotion, PromotionFormValues, PromotionType } from "../types";

const TYPE_LABELS: Record<string, string> = {
  daily_menu: "Menú del día",
  happy_hour: "Happy hour",
  percentage_discount: "Descuento porcentual",
  special_price: "Precio especial",
  two_for_one: "2x1",
};
const TYPE_OPTIONS = ["percentage_discount", "special_price", "two_for_one"].map((id) => ({
  id,
  label: TYPE_LABELS[id] ?? id,
}));
const SCOPE_OPTIONS = [
  { id: "dish", label: "Platos concretos" },
  { id: "category", label: "Categorías" },
];
const STATUS_OPTIONS = [
  { id: "active", label: "Activa" },
  { id: "inactive", label: "Inactiva" },
  { id: "expired", label: "Expirada" },
];
export function PromotionsListPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para gestionar promociones." />;
  return <PromotionsList branchId={branch.id} />;
}
function PromotionsList({ branchId }: { branchId: string }) {
  const canWrite = useCan("promotions.write");
  const { isDefault } = useSelectedLanguage();
  const canManage = canWrite && isDefault;
  const promotions = usePromotionsListController(branchId);
  return (
    <div className="admin-page">
      <PageHeader kicker="Promociones" title="Promociones" />
      {canWrite && !isDefault ? (
        <div>
          <p>Cambia al idioma base para crear promociones.</p>
          <Button disabled>Nueva promoción</Button>
        </div>
      ) : null}
      <EntityListCard
        action={
          canManage ? (
            <Link className="admin-link" to="/promotions/new">
              <Icon name="plus" /> Nueva promoción
            </Link>
          ) : null
        }
        count={promotions.length}
        emptyText="Aún no hay promociones."
        title="Activas y programadas"
      >
        {promotions.map((promotion) => (
          <li className="admin-list-item" key={promotion.id}>
            <Link
              className="admin-link admin-list-label"
              params={{ promotionId: promotion.id }}
              to="/promotions/$promotionId"
            >
              {promotion.name}
            </Link>
            <span className="admin-list-meta">
              {TYPE_LABELS[promotion.type] ?? promotion.type} ·{" "}
              {STATUS_OPTIONS.find(({ id }) => id === promotion.status)?.label.toLowerCase() ?? promotion.status}
            </span>
          </li>
        ))}
      </EntityListCard>
    </div>
  );
}
export function PromotionEditorPage({ promotionId }: { promotionId?: string }) {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
  if (!branch) return <NoBranchState description="Crea una sucursal para gestionar promociones." />;
  if (!language.isDefault && language.languageCode)
    return promotionId ? (
      <TranslatedPromotionForm
        key={`${branch.id}:${promotionId}:${language.languageCode}`}
        branchId={branch.id}
        languageCode={language.languageCode}
        promotionId={promotionId}
      />
    ) : (
      <p>Cambia al idioma base para crear una promoción.</p>
    );
  return promotionId ? (
    <ExistingPromotion branchId={branch.id} promotionId={promotionId} key={`${branch.id}:${promotionId}`} />
  ) : (
    <PromotionForm branchId={branch.id} promotion={null} key={branch.id} />
  );
}
function ExistingPromotion({ branchId, promotionId }: { branchId: string; promotionId: string }) {
  const { data } = useSuspenseQuery(getPromotionQueryOptions({ promotionId, trpc }));
  if (!isEditablePromotion(data)) {
    return <UnsupportedPromotion name={data.name} />;
  }
  return <PromotionForm branchId={branchId} promotion={data} />;
}
function UnsupportedPromotion({ name }: { name: string }) {
  return (
    <div className="admin-page">
      <PageHeader kicker="Promoción no editable" title={name} />
      <InlineMessage
        message="Este tipo de promoción se conserva sin cambios, pero todavía no puede editarse desde este formulario."
        tone="warning"
      />
    </div>
  );
}
function PromotionForm({ branchId, promotion }: { branchId: string; promotion: EditablePromotion | null }) {
  const canWrite = useCan("promotions.write");
  const controller = usePromotionEditorController({ branchId, promotion });
  useEditorGuard({ dirty: controller.form.formState.isDirty, pending: controller.busy });
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader kicker={promotion ? "Editar promoción" : "Nueva promoción"} title={promotion?.name ?? "Promoción"} />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.busy}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <div className="admin-form-grid">
            <FormTextInput<PromotionFormValues> label="Nombre" name="name" />
            <FormTextarea<PromotionFormValues> label="Descripción" name="description" rows={3} />
            <FormSelect<PromotionFormValues> label="Tipo" name="type" options={TYPE_OPTIONS} />
            <PromotionValueFields type={controller.type} />
            <FormSelect<PromotionFormValues> label="Aplicar a" name="scope" options={SCOPE_OPTIONS} />
            <FormSelect<PromotionFormValues> label="Estado" name="status" options={STATUS_OPTIONS} />
          </div>
          <FormChipGroup<PromotionFormValues>
            label={controller.scope === "dish" ? "Platos" : "Categorías"}
            name="targetIds"
            options={controller.targetOptions}
          />
        </FormShell>
      </FormProvider>
    </div>
  );
}
function TranslatedPromotionForm({
  branchId,
  languageCode,
  promotionId,
}: {
  branchId: string;
  languageCode: string;
  promotionId: string;
}) {
  const { data: promotion } = useSuspenseQuery(getPromotionQueryOptions({ promotionId, trpc }));
  if (!isEditablePromotion(promotion)) {
    return (
      <div className="admin-page">
        <UnsupportedPromotion name={promotion.name} />
        <p>
          {TYPE_LABELS[promotion.type] ?? promotion.type} · {promotion.status}
        </p>
        <TranslationEditor branchId={branchId} entityId={promotionId} languageCode={languageCode} />
      </div>
    );
  }
  return <TranslatedEditablePromotion branchId={branchId} languageCode={languageCode} promotion={promotion} />;
}

function TranslatedEditablePromotion({
  branchId,
  languageCode,
  promotion,
}: {
  branchId: string;
  languageCode: string;
  promotion: EditablePromotion;
}) {
  const canTranslate = useCan("languages.write");
  const controller = usePromotionEditorController({ branchId, promotion });
  const translation = useTranslationForm({ branchId, languageCode });
  const initialValues = useMemo(
    () => ({
      ...toPromotionFormValues(promotion),
      description: translation.value({
        entityType: "promotion",
        entityId: promotion.id,
        field: "description",
        fallback: promotion.description ?? "",
      }),
      name: translation.value({
        entityType: "promotion",
        entityId: promotion.id,
        field: "name",
        fallback: promotion.name,
      }),
    }),
    [promotion, translation],
  );
  useEffect(() => {
    if (!controller.form.formState.isDirty) controller.form.reset(initialValues);
  }, [controller.form, initialValues]);
  useEditorGuard({ dirty: controller.form.formState.isDirty, pending: translation.pending });
  const submit = async () => {
    if (!canTranslate || !(await controller.form.trigger(["name", "description"]))) return;
    const values = controller.form.getValues();
    const rows = [
      values.name === initialValues.name &&
      !translation.isIncomplete({ entityType: "promotion", entityId: promotion.id, field: "name" })
        ? null
        : translation.saveRow({ entityType: "promotion", entityId: promotion.id, field: "name", value: values.name }),
      values.description === initialValues.description &&
      !translation.isIncomplete({ entityType: "promotion", entityId: promotion.id, field: "description" })
        ? null
        : translation.saveRow({
            entityType: "promotion",
            entityId: promotion.id,
            field: "description",
            value: values.description,
          }),
    ].filter((row): row is NonNullable<typeof row> => row !== null);
    if (rows.length === 0) return;
    try {
      await translation.saveRows(rows);
      controller.form.reset(values);
      toast.success("Traducción guardada.");
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader
        description="Edita los textos de esta promoción. El resto de la configuración se mantiene en el idioma base."
        kicker="Editar promoción"
        title={promotion.name}
      />
      <FormProvider {...controller.form}>
        <FormShell
          busy={translation.pending}
          onCancel={controller.cancel}
          onSubmit={() => void submit()}
          readOnly={!canTranslate}
          submitLabel="Guardar traducción"
        >
          <div className="admin-form-grid">
            <FormTextInput<PromotionFormValues> disabled={!canTranslate} label="Nombre" name="name" />
            <FormTextarea<PromotionFormValues>
              disabled={!canTranslate}
              label="Descripción"
              name="description"
              rows={3}
            />
            <FormSelect<PromotionFormValues> disabled label="Tipo (idioma base)" name="type" options={TYPE_OPTIONS} />
            <PromotionValueFields disabled type={controller.type} />
            <FormSelect<PromotionFormValues>
              disabled
              label="Aplicar a (idioma base)"
              name="scope"
              options={SCOPE_OPTIONS}
            />
            <FormSelect<PromotionFormValues>
              disabled
              label="Estado (idioma base)"
              name="status"
              options={STATUS_OPTIONS}
            />
          </div>
          <FormChipGroup
            disabled
            label={controller.scope === "dish" ? "Platos (idioma base)" : "Categorías (idioma base)"}
            name="targetIds"
            options={controller.targetOptions}
          />
        </FormShell>
      </FormProvider>
    </div>
  );
}

function PromotionValueFields({ type, disabled = false }: { type: PromotionType; disabled?: boolean }) {
  if (type === "percentage_discount") {
    return (
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode="decimal"
        label="Porcentaje (0-100)"
        name="percentage"
      />
    );
  }

  if (type === "special_price") {
    return (
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode="decimal"
        label="Precio especial"
        name="specialPrice"
      />
    );
  }

  return (
    <>
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode="numeric"
        label="Unidades que lleva"
        name="buyQuantity"
      />
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode="numeric"
        label="Unidades que paga"
        name="paidQuantity"
      />
    </>
  );
}
