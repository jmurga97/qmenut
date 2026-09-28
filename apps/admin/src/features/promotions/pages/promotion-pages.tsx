import { Button, InlineMessage } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo } from "react";
import { FormProvider } from "react-hook-form";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
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
  daily_menu: i18n.t("promotions___Menú del día"),
  happy_hour: i18n.t("promotions___Happy hour"),
  percentage_discount: i18n.t("promotions___Descuento porcentual"),
  special_price: i18n.t("promotions___Precio especial"),
  two_for_one: i18n.t("promotions___2x1"),
};
const TYPE_OPTIONS = ["percentage_discount", "special_price", "two_for_one"].map((id) => ({
  id,
  label: TYPE_LABELS[id] ?? id,
}));
const SCOPE_OPTIONS = [
  { id: "dish", label: i18n.t("promotions___Platos concretos") },
  { id: "category", label: i18n.t("promotions___Categorías") },
];
const STATUS_OPTIONS = [
  { id: "active", label: i18n.t("promotions___Activa") },
  { id: "inactive", label: i18n.t("promotions___Inactiva") },
  { id: "expired", label: i18n.t("promotions___Expirada") },
];
export function PromotionsListPage() {
  const branch = useSelectedBranch();
  if (!branch)
    return <NoBranchState description={i18n.t("promotions___Crea una sucursal para gestionar promociones.")} />;
  return <PromotionsList branchId={branch.id} />;
}
function PromotionsList({ branchId }: { branchId: string }) {
  const canWrite = useCan("promotions.write");
  const { isDefault } = useSelectedLanguage();
  return (
    <div className={"ming-page admin-page"}>
      <PageHeader kicker={i18n.t("promotions___Promociones")} title={i18n.t("promotions___Promociones")} />
      {canWrite && !isDefault ? (
        <div>
          <p>{i18n.t("promotions___Cambia al idioma base para crear promociones.")}</p>
          <Button disabled>{i18n.t("promotions___Nueva promoción")}</Button>
        </div>
      ) : null}
      <Suspense fallback={<CardSkeleton rows={4} title={i18n.t("promotions___Activas y programadas")} />}>
        <PromotionsListCard branchId={branchId} canManage={canWrite && isDefault} />
      </Suspense>
    </div>
  );
}
function PromotionsListCard({ branchId, canManage }: { branchId: string; canManage: boolean }) {
  const promotions = usePromotionsListController(branchId);
  return (
    <EntityListCard
      action={
        canManage ? (
          <Link className="admin-link" to={"/promotions/new"}>
            {i18n.t("promotions___Nueva promoción")}
          </Link>
        ) : null
      }
      count={promotions.length}
      emptyText={i18n.t("promotions___Aún no hay promociones.")}
      title={i18n.t("promotions___Activas y programadas")}
    >
      {promotions.map((promotion) => (
        <li className="admin-list-item" key={promotion.id}>
          <Link
            className={"admin-link admin-list-label"}
            params={{ promotionId: promotion.id }}
            to={"/promotions/$promotionId"}
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
  );
}
export function PromotionEditorPage({ promotionId }: { promotionId?: string }) {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
  if (!branch)
    return <NoBranchState description={i18n.t("promotions___Crea una sucursal para gestionar promociones.")} />;
  if (!language.isDefault && language.languageCode)
    return promotionId ? (
      <TranslatedPromotionForm
        key={`${branch.id}:${promotionId}:${language.languageCode}`}
        branchId={branch.id}
        languageCode={language.languageCode}
        promotionId={promotionId}
      />
    ) : (
      <p>{i18n.t("promotions___Cambia al idioma base para crear una promoción.")}</p>
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
    <div className={"ming-page admin-page"}>
      <PageHeader kicker={i18n.t("promotions___Promoción no editable")} title={name} />
      <InlineMessage
        message={i18n.t(
          "promotions___Este tipo de promoción se conserva sin cambios, pero todavía no puede editarse desde este formulario.",
        )}
        tone={"warning"}
      />
    </div>
  );
}
function PromotionForm({ branchId, promotion }: { branchId: string; promotion: EditablePromotion | null }) {
  const canWrite = useCan("promotions.write");
  const controller = usePromotionEditorController({ branchId, promotion });
  useEditorGuard({ dirty: controller.form.formState.isDirty, pending: controller.busy });
  return (
    <div className={"ming-page admin-page admin-editor-page"}>
      <PageHeader
        kicker={promotion ? i18n.t("promotions___Editar promoción") : i18n.t("promotions___Nueva promoción")}
        title={promotion?.name ?? i18n.t("promotions___Promoción")}
      />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.busy}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <PromotionFields controller={controller} />
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
      <div className={"ming-page admin-page"}>
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
      toast.success(i18n.t("promotions___Traducción guardada."));
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <div className={"ming-page admin-page admin-editor-page"}>
      <PageHeader
        description={i18n.t(
          "promotions___Edita los textos de esta promoción. El resto de la configuración se mantiene en el idioma base.",
        )}
        kicker={i18n.t("promotions___Editar promoción")}
        title={promotion.name}
      />
      <FormProvider {...controller.form}>
        <FormShell
          busy={translation.pending}
          onCancel={controller.cancel}
          onSubmit={() => void submit()}
          readOnly={!canTranslate}
          submitLabel={i18n.t("promotions___Guardar traducción")}
        >
          <PromotionFields canEdit={canTranslate} controller={controller} locked />
        </FormShell>
      </FormProvider>
    </div>
  );
}

type PromotionEditorController = ReturnType<typeof usePromotionEditorController>;

// `locked` = translation mode: only name and description stay editable; the rest belongs to the base language.
function PromotionFields({
  canEdit = true,
  controller,
  locked = false,
}: {
  canEdit?: boolean;
  controller: PromotionEditorController;
  locked?: boolean;
}) {
  const base = (label: string) => (locked ? i18n.t("promotions___{{label}} (idioma base)", { label }) : label);
  return (
    <>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("promotions___Datos de la promoción")}</h2>
        <FormTextInput<PromotionFormValues> disabled={!canEdit} label={i18n.t("promotions___Nombre")} name={"name"} />
        <FormTextarea<PromotionFormValues>
          disabled={!canEdit}
          label={i18n.t("promotions___Descripción")}
          name={"description"}
          rows={3}
        />
        <FormSelect<PromotionFormValues>
          disabled={locked}
          label={base(i18n.t("promotions___Estado"))}
          name={"status"}
          options={STATUS_OPTIONS}
        />
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("promotions___Descuento")}</h2>
        <div className="admin-form-grid--two">
          <FormSelect<PromotionFormValues>
            disabled={locked}
            label={base(i18n.t("promotions___Tipo"))}
            name={"type"}
            options={TYPE_OPTIONS}
          />
          <PromotionValueFields disabled={locked} type={controller.type} />
        </div>
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("promotions___Alcance")}</h2>
        <FormSelect<PromotionFormValues>
          disabled={locked}
          label={base(i18n.t("promotions___Aplicar a"))}
          name={"scope"}
          options={SCOPE_OPTIONS}
        />
        <FormChipGroup<PromotionFormValues>
          disabled={locked}
          label={base(controller.scope === "dish" ? i18n.t("promotions___Platos") : i18n.t("promotions___Categorías"))}
          name={"targetIds"}
          options={controller.targetOptions}
        />
      </section>
    </>
  );
}

function PromotionValueFields({ type, disabled = false }: { type: PromotionType; disabled?: boolean }) {
  if (type === "percentage_discount") {
    return (
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode={"decimal"}
        label={i18n.t("promotions___Porcentaje (0-100)")}
        name={"percentage"}
      />
    );
  }

  if (type === "special_price") {
    return (
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode={"decimal"}
        label={i18n.t("promotions___Precio especial")}
        name={"specialPrice"}
      />
    );
  }

  return (
    <>
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode={"numeric"}
        label={i18n.t("promotions___Unidades que lleva")}
        name={"buyQuantity"}
      />
      <FormTextInput<PromotionFormValues>
        disabled={disabled}
        inputMode={"numeric"}
        label={i18n.t("promotions___Unidades que paga")}
        name={"paidQuantity"}
      />
    </>
  );
}
