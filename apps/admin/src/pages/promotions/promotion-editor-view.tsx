import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { getErrorMessage } from "@lib/errors";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

import type { PromotionDetail } from "@lib/api-types";

type PromoType = "percentage_discount" | "special_price";
type PromoScope = "dish" | "category";
type PromoStatus = "active" | "inactive" | "expired";

interface PromotionEditorViewProps {
  promotionId?: string;
}

export function PromotionEditorView({ promotionId }: PromotionEditorViewProps) {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <p className="admin-copy">Selecciona una sucursal para gestionar promociones.</p>
      </div>
    );
  }

  if (promotionId) {
    return <PromotionEditLoader branchId={branch.id} promotionId={promotionId} key={promotionId} />;
  }

  return <PromotionForm branchId={branch.id} promotion={null} />;
}

function PromotionEditLoader({ branchId, promotionId }: { branchId: string; promotionId: string }) {
  const { data: promotion } = useSuspenseQuery(trpc.admin.promotions.get.queryOptions({ promotionId }));
  return <PromotionForm branchId={branchId} promotion={promotion} />;
}

function PromotionForm({ branchId, promotion }: { branchId: string; promotion: PromotionDetail | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: categories } = useSuspenseQuery(trpc.admin.menu.categories.list.queryOptions({ branchId }));
  const { data: dishes } = useSuspenseQuery(trpc.admin.menu.dishes.list.queryOptions({ branchId }));

  const [name, setName] = useState(promotion?.name ?? "");
  const [type, setType] = useState<PromoType>((promotion?.type as PromoType) ?? "percentage_discount");
  const [scope, setScope] = useState<PromoScope>((promotion?.scope as PromoScope) ?? "dish");
  const [status, setStatus] = useState<PromoStatus>((promotion?.status as PromoStatus) ?? "active");
  const [percentage, setPercentage] = useState(promotion?.percentage != null ? String(promotion.percentage) : "");
  const [specialPriceEuros, setSpecialPriceEuros] = useState(
    promotion?.specialPrice != null ? (promotion.specialPrice / 100).toString() : "",
  );
  const [targetIds, setTargetIds] = useState<string[]>(promotion?.targets.map((target) => target.targetId) ?? []);

  const createMutation = useMutation(trpc.admin.promotions.create.mutationOptions());
  const updateMutation = useMutation(trpc.admin.promotions.update.mutationOptions());
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const candidateTargets = scope === "dish" ? dishes : categories;

  function toggleTarget(id: string) {
    setTargetIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  }

  async function handleSubmit() {
    setServerError(null);

    const data = {
      type,
      scope,
      name,
      description: undefined,
      percentage: type === "percentage_discount" ? Number(percentage) : null,
      specialPrice: type === "special_price" ? Math.round(Number(specialPriceEuros) * 100) : null,
      priority: 0,
      startsAt: null,
      endsAt: null,
      isRecurring: false,
      recurringDays: undefined,
      recurringStartMinute: null,
      recurringEndMinute: null,
      status,
    };

    const targets = targetIds.map((id) => ({ targetType: scope, targetId: id }));

    try {
      if (promotion) {
        await updateMutation.mutateAsync({ promotionId: promotion.id, data, targets });
      } else {
        await createMutation.mutateAsync({ branchId, data, targets });
      }

      await queryClient.invalidateQueries({ queryKey: trpc.admin.promotions.list.queryKey({ branchId }) });
      await navigate({ to: "/promotions" });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">{promotion ? "Editar promoción" : "Nueva promoción"}</div>
        <h3>{promotion?.name ?? "Promoción"}</h3>
      </header>

      <div className="admin-editor-shell">
        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Nombre</span>
            <input onChange={(event) => setName(event.currentTarget.value)} type="text" value={name} />
          </label>

          <label className="admin-field">
            <span>Tipo</span>
            <select onChange={(event) => setType(event.currentTarget.value as PromoType)} value={type}>
              <option value="percentage_discount">Descuento porcentual</option>
              <option value="special_price">Precio especial</option>
            </select>
          </label>

          {type === "percentage_discount" ? (
            <label className="admin-field">
              <span>Porcentaje (0-100)</span>
              <input
                max={100}
                min={0}
                onChange={(event) => setPercentage(event.currentTarget.value)}
                type="number"
                value={percentage}
              />
            </label>
          ) : (
            <label className="admin-field">
              <span>Precio especial (€)</span>
              <input
                min={0}
                onChange={(event) => setSpecialPriceEuros(event.currentTarget.value)}
                step="0.01"
                type="number"
                value={specialPriceEuros}
              />
            </label>
          )}

          <label className="admin-field">
            <span>Aplicar a</span>
            <select
              onChange={(event) => {
                setScope(event.currentTarget.value as PromoScope);
                setTargetIds([]);
              }}
              value={scope}
            >
              <option value="dish">Platos concretos</option>
              <option value="category">Categorías</option>
            </select>
          </label>

          <label className="admin-field">
            <span>Estado</span>
            <select onChange={(event) => setStatus(event.currentTarget.value as PromoStatus)} value={status}>
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
              <option value="expired">Expirada</option>
            </select>
          </label>
        </div>

        <section className="admin-editor-section">
          <div className="admin-kicker">{scope === "dish" ? "Platos" : "Categorías"}</div>
          <div className="admin-chip-row">
            {candidateTargets.map((target) => {
              const active = targetIds.includes(target.id);
              return (
                <button
                  className={active ? "admin-chip admin-chip--active" : "admin-chip"}
                  key={target.id}
                  onClick={() => toggleTarget(target.id)}
                  type="button"
                >
                  {target.name}
                </button>
              );
            })}
          </div>
        </section>

        {serverError ? <mc-inline-message message={serverError} tone="error" /> : null}

        <div className="admin-topbar-actions">
          <mc-button disabled={isSubmitting} onClick={() => void navigate({ to: "/promotions" })} variant="secondary">
            Cancelar
          </mc-button>
          <mc-button disabled={isSubmitting} onClick={() => void handleSubmit()} variant="primary">
            {isSubmitting ? "Guardando…" : "Guardar"}
          </mc-button>
        </div>
      </div>
    </div>
  );
}
