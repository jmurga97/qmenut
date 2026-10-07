import { Button, InlineMessage } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense } from "react";
import { FormProvider } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormShell } from "~/shared/components/forms/form-shell";
import { DetailEmpty, MasterDetail } from "~/shared/components/master-detail";
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { getPromotionQueryOptions } from "../api";
import { PromotionStatusControl } from "../components/promotion-status-control";
import { usePromotionEditorController, usePromotionsListController } from "../hooks/use-promotions-controller";
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
export function PromotionsLayout() {
  const branch = useSelectedBranch();
  if (!branch)
    return <NoBranchState description={i18n.t("promotions___Crea una sucursal para gestionar promociones.")} />;
  return (
    <div className={"ming-page admin-page"}>
      <PageHeader kicker={i18n.t("promotions___Promociones")} title={i18n.t("promotions___Promociones")} />
      <MasterDetail
        list={
          <Suspense fallback={<CardSkeleton rows={4} title={i18n.t("promotions___Activas y programadas")} />}>
            <PromotionsList branchId={branch.id} />
          </Suspense>
        }
      />
    </div>
  );
}
function CreatePromotionButton() {
  const canWrite = useCan("promotions.write");
  if (!canWrite) return null;
  return (
    <Button nativeButton={false} render={<Link to={"/promotions/new"} />} size={"sm"} variant={"secondary"}>
      {i18n.t("promotions___Nueva promoción")}
    </Button>
  );
}
export function PromotionsIndex() {
  return <DetailEmpty text={i18n.t("promotions___Selecciona una promoción para editarla o crea una nueva.")} />;
}
function PromotionsList({ branchId }: { branchId: string }) {
  const promotions = usePromotionsListController(branchId);
  return (
    <EntityListCard
      action={<CreatePromotionButton />}
      count={promotions.length}
      emptyText={i18n.t("promotions___Aún no hay promociones.")}
      title={i18n.t("promotions___Activas y programadas")}
    >
      {promotions.map((promotion) => (
        <li className="admin-list-item" key={promotion.id}>
          <div className="admin-list-text">
            <Link
              className={"admin-link admin-list-label"}
              params={{ promotionId: promotion.id }}
              to={"/promotions/$promotionId"}
            >
              {promotion.name}
            </Link>
            <span className="admin-list-meta">{TYPE_LABELS[promotion.type] ?? promotion.type}</span>
          </div>
          <PromotionStatusControl branchId={branchId} promotion={promotion} />
        </li>
      ))}
    </EntityListCard>
  );
}
export function PromotionEditorPage({ promotionId }: { promotionId?: string }) {
  const branch = useSelectedBranch();
  if (!branch)
    return <NoBranchState description={i18n.t("promotions___Crea una sucursal para gestionar promociones.")} />;
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
  // Keyed on status so a toggle from the list reloads the form instead of leaving a stale "Estado".
  return <PromotionForm branchId={branchId} key={data.status} promotion={data} />;
}
function UnsupportedPromotion({ name }: { name: string }) {
  return (
    <div className="admin-detail">
      <PageHeader headingLevel={2} kicker={i18n.t("promotions___Promoción no editable")} title={name} />
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
    <div className="admin-detail">
      <PageHeader
        headingLevel={2}
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
type PromotionEditorController = ReturnType<typeof usePromotionEditorController>;

function PromotionFields({ controller }: { controller: PromotionEditorController }) {
  return (
    <>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("promotions___Datos de la promoción")}</h2>
        <FormTextInput<PromotionFormValues> label={i18n.t("promotions___Nombre")} name={"name"} />
        <FormTextarea<PromotionFormValues> label={i18n.t("promotions___Descripción")} name={"description"} rows={3} />
        <FormSelect<PromotionFormValues>
          label={i18n.t("promotions___Estado")}
          name={"status"}
          options={STATUS_OPTIONS}
        />
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("promotions___Descuento")}</h2>
        <div className="admin-form-grid--two">
          <FormSelect<PromotionFormValues> label={i18n.t("promotions___Tipo")} name={"type"} options={TYPE_OPTIONS} />
          <PromotionValueFields type={controller.type} />
        </div>
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("promotions___Alcance")}</h2>
        <FormSelect<PromotionFormValues>
          label={i18n.t("promotions___Aplicar a")}
          name={"scope"}
          options={SCOPE_OPTIONS}
        />
        <FormChipGroup<PromotionFormValues>
          label={controller.scope === "dish" ? i18n.t("promotions___Platos") : i18n.t("promotions___Categorías")}
          name={"targetIds"}
          options={controller.targetOptions}
        />
      </section>
    </>
  );
}

function PromotionValueFields({ type }: { type: PromotionType }) {
  if (type === "percentage_discount") {
    return (
      <FormTextInput<PromotionFormValues>
        inputMode={"decimal"}
        label={i18n.t("promotions___Porcentaje (0-100)")}
        name={"percentage"}
      />
    );
  }

  if (type === "special_price") {
    return (
      <>
        <FormTextInput<PromotionFormValues>
          inputMode={"decimal"}
          label={i18n.t("promotions___Precio especial")}
          name={"specialPrice"}
        />
        <p className="admin-copy">
          {i18n.t("promotions___En platos con variantes de precio se aplica a la variante más barata.")}
        </p>
      </>
    );
  }

  return (
    <>
      <FormTextInput<PromotionFormValues>
        inputMode={"numeric"}
        label={i18n.t("promotions___Unidades que lleva")}
        name={"buyQuantity"}
      />
      <FormTextInput<PromotionFormValues>
        inputMode={"numeric"}
        label={i18n.t("promotions___Unidades que paga")}
        name={"paidQuantity"}
      />
    </>
  );
}
