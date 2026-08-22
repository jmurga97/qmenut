import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { FormProvider } from "react-hook-form";

import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NotFoundState } from "~/shared/components/state/not-found-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { ImageUploadControl } from "~/shared/images/image-upload-control";
import { eurosToCents, formatMoney } from "~/shared/services/money";

import { getDishDetailQueryOptions } from "../api";
import {
  useCategoryEditorController,
  useDishEditorController,
  useMenuListController,
} from "../hooks/use-menu-controllers";

import type { DishDetail, CategoryFormValues, DishFormValues } from "../types";

export function MenuListPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para gestionar su carta." />;
  return <MenuList branchId={branch.id} />;
}
function MenuList({ branchId }: { branchId: string }) {
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const canWrite = useCan("menu.write");
  const { availabilityError, availabilityPendingDishId, categories, dishes, setAvailability } =
    useMenuListController(branchId);
  return (
    <div className="admin-page">
      <PageHeader description="Gestiona las categorías y los platos de esta sucursal." kicker="Carta" title="Menú" />
      <EntityListCard
        action={
          canWrite ? (
            <Link className="admin-link" to="/menu/categories/new">
              + Nueva categoría
            </Link>
          ) : null
        }
        count={categories.length}
        emptyText="Aún no hay categorías."
        title="Categorías"
      >
        {categories.map((category) => (
          <li className="admin-list-item" key={category.id}>
            <Link
              className="admin-link admin-list-label"
              params={{ categoryId: category.id }}
              to="/menu/categories/$categoryId"
            >
              {category.name}
            </Link>
            <span className="admin-list-meta">{category.isActive ? "activa" : "oculta"}</span>
          </li>
        ))}
      </EntityListCard>
      <EntityListCard
        action={
          canWrite ? (
            <Link className="admin-link" to="/menu/dishes/new">
              + Nuevo plato
            </Link>
          ) : null
        }
        count={dishes.length}
        emptyText="Aún no hay platos."
        title="Platos"
      >
        {dishes.map((dish) => (
          <li className="admin-list-item" key={dish.id}>
            <Link className="admin-link admin-list-label" params={{ dishId: dish.id }} to="/menu/dishes/$dishId">
              {dish.name}
            </Link>
            <div className="admin-toolbar-controls">
              <span className="admin-list-meta">{formatMoney(dish.price)}</span>
              {canToggleAvailability ? (
                <label className="admin-checkbox admin-list-meta">
                  <input
                    aria-label={`Disponibilidad de ${dish.name}`}
                    checked={dish.isActive}
                    disabled={availabilityPendingDishId === dish.id}
                    onChange={(event) => setAvailability(dish.id, event.currentTarget.checked)}
                    type="checkbox"
                  />
                  {dish.isActive ? "Disponible" : "Oculto"}
                </label>
              ) : (
                <span className="admin-list-meta">{dish.isActive ? "Disponible" : "Oculto"}</span>
              )}
            </div>
          </li>
        ))}
      </EntityListCard>
      <FormFeedback error={availabilityError} />
    </div>
  );
}
export function CategoryEditorPage({ categoryId }: { categoryId?: string }) {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para editar su carta." />;
  return <CategoryForm branchId={branch.id} categoryId={categoryId} key={`${branch.id}:${categoryId ?? "new"}`} />;
}
function CategoryForm({ branchId, categoryId }: { branchId: string; categoryId?: string }) {
  const canWrite = useCan("menu.write");
  const controller = useCategoryEditorController({ branchId, categoryId });
  if (categoryId && !controller.category) return <NotFoundState />;
  return (
    <div className="admin-page">
      <PageHeader
        kicker={categoryId ? "Editar categoría" : "Nueva categoría"}
        title={controller.category?.name ?? "Categoría"}
      />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.busy}
          error={controller.error}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <div className="admin-form-grid">
            <FormTextInput<CategoryFormValues> label="Nombre" name="name" />
            <FormTextarea<CategoryFormValues> label="Descripción" name="description" rows={3} />
            <ImageUploadControl
              disabled={controller.busy}
              draft={controller.image.draft}
              label="Imagen de categoría"
              onRemove={controller.image.remove}
              onRetry={controller.image.retry}
              onSelect={controller.image.selectFile}
            />
            <FormCheckbox<CategoryFormValues> label="Categoría activa" name="isActive" />
          </div>
        </FormShell>
      </FormProvider>
    </div>
  );
}
export function DishEditorPage({ dishId }: { dishId?: string }) {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para editar su carta." />;
  return dishId ? (
    <ExistingDish branchId={branch.id} dishId={dishId} key={`${branch.id}:${dishId}`} />
  ) : (
    <DishForm branchId={branch.id} dish={null} key={branch.id} />
  );
}
function ExistingDish({ branchId, dishId }: { branchId: string; dishId: string }) {
  const dish = useSuspenseQuery(getDishDetailQueryOptions({ dishId, trpc })).data;
  return <DishForm branchId={branchId} dish={dish} />;
}
function DishForm({ branchId, dish }: { branchId: string; dish: DishDetail | null }) {
  const canWrite = useCan("menu.write");
  const controller = useDishEditorController({ branchId, dish });
  return (
    <div className="admin-page">
      <PageHeader kicker={dish ? "Editar plato" : "Nuevo plato"} title={dish?.name ?? "Plato"} />
      <FormProvider {...controller.form}>
        <FormShell
          busy={controller.busy}
          error={controller.error}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <div className="admin-form-grid">
            <FormTextInput<DishFormValues> label="Nombre" name="name" />
            <FormSelect<DishFormValues> label="Categoría" name="categoryId" options={controller.categoryOptions} />
            <FormTextInput<DishFormValues> inputMode="decimal" label="Precio" name="priceEuros" />
            <ImageUploadControl
              disabled={controller.busy}
              draft={controller.image.draft}
              label="Imagen del plato"
              onRemove={controller.image.remove}
              onRetry={controller.image.retry}
              onSelect={controller.image.selectFile}
            />
            <FormTextarea<DishFormValues> label="Descripción" name="description" rows={3} />
            <div className="admin-form-grid--two">
              <FormCheckbox<DishFormValues> label="Activo" name="isActive" />
              <FormCheckbox<DishFormValues> label="Recomendado" name="isRecommended" />
              <FormCheckbox<DishFormValues> label="Destacado" name="isFeatured" />
            </div>
          </div>
          <FormChipGroup<DishFormValues> label="Etiquetas" name="tagIds" options={controller.tagOptions} />
          <FormChipGroup<DishFormValues> label="Alérgenos" name="allergenIds" options={controller.allergenOptions} />
          <FormChipGroup<DishFormValues> label="Extras" name="extraIngredientIds" options={controller.extraOptions} />
          <ExtraIngredientCreator busy={controller.busy} onAdd={controller.addExtra} />
        </FormShell>
      </FormProvider>
    </div>
  );
}

function ExtraIngredientCreator({
  busy,
  onAdd,
}: {
  busy: boolean;
  onAdd: (input: { name: string; price: number }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const priceInCents = eurosToCents(price);
  const canAdd =
    name.trim().length > 0 && price.trim().length > 0 && Number.isFinite(priceInCents) && priceInCents >= 0;
  const add = () => {
    if (!canAdd || busy) return;
    void onAdd({ name: name.trim(), price: priceInCents }).then(
      () => {
        setName("");
        setPrice("0");
      },
      () => null,
    );
  };
  return (
    <div className="admin-form-grid admin-form-grid--two">
      <label className="admin-field">
        <span>Nombre del extra</span>
        <input onChange={(event) => setName(event.currentTarget.value)} value={name} />
      </label>
      <label className="admin-field">
        <span>Precio en euros</span>
        <input inputMode="decimal" onChange={(event) => setPrice(event.currentTarget.value)} value={price} />
      </label>
      <mc-button className="admin-inline-button" disabled={!canAdd || busy} onClick={add} variant="secondary">
        + Añadir extra
      </mc-button>
    </div>
  );
}
