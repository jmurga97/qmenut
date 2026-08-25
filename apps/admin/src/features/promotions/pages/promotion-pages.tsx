import { InlineMessage } from "@ming/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FormProvider } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { getPromotionQueryOptions } from "../api";
import { usePromotionEditorController, usePromotionsListController } from "../hooks/use-promotions-controller";
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
  const promotions = usePromotionsListController(branchId);
  return (
    <div className="admin-page">
      <PageHeader kicker="Promociones" title="Promociones" />
      <EntityListCard
        action={
          canWrite ? (
            <Link className="admin-link" to="/promotions/new">
              + Nueva promoción
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
  if (!branch) return <NoBranchState description="Crea una sucursal para gestionar promociones." />;
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
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader kicker={promotion ? "Editar promoción" : "Nueva promoción"} title={promotion?.name ?? "Promoción"} />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.busy}
          error={controller.error}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <div className="admin-form-grid">
            <FormTextInput<PromotionFormValues> label="Nombre" name="name" />
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
function PromotionValueFields({ type }: { type: PromotionType }) {
  if (type === "percentage_discount") {
    return <FormTextInput<PromotionFormValues> inputMode="decimal" label="Porcentaje (0-100)" name="percentage" />;
  }

  if (type === "special_price") {
    return (
      <FormTextInput<PromotionFormValues> inputMode="decimal" label="Precio especial (€)" name="specialPriceEuros" />
    );
  }

  return (
    <>
      <FormTextInput<PromotionFormValues> inputMode="numeric" label="Unidades que lleva" name="buyQuantity" />
      <FormTextInput<PromotionFormValues> inputMode="numeric" label="Unidades que paga" name="paidQuantity" />
    </>
  );
}
