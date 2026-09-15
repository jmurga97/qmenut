import { Button, Field, Input, Switch } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FormProvider, useController, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormShell } from "~/shared/components/forms/form-shell";
import { Icon } from "~/shared/components/icon";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NotFoundState } from "~/shared/components/state/not-found-state";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { useTranslationForm } from "~/shared/hooks/use-translation-form";
import { SingleImageUploadControl } from "~/shared/images/single-image-upload-control";
import { formatMoney } from "~/shared/services/money";

import { getDishDetailQueryOptions } from "../api";
import {
  useCategoryEditorController,
  useDishEditorController,
  useMenuListController,
} from "../hooks/use-menu-controllers";
import { toDishFormValues } from "../mappers";

import type { DishDetail, CategoryFormValues, DishFormValues } from "../types";

export function MenuListPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para gestionar su carta." />;
  return <MenuList branchId={branch.id} />;
}
export function MenuSectionTabs({ current }: { current: "extras" | "menu" }) {
  return (
    <nav aria-label="Secciones de la carta" className="admin-tabs">
      <Link
        aria-current={current === "menu" ? "page" : undefined}
        className={current === "menu" ? "active" : undefined}
        to="/menu"
      >
        Menú
      </Link>
      <Link
        aria-current={current === "extras" ? "page" : undefined}
        className={current === "extras" ? "active" : undefined}
        to="/menu/extras"
      >
        Extras
      </Link>
    </nav>
  );
}
function MenuList({ branchId }: { branchId: string }) {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const canWrite = useCan("menu.write");
  const { isDefault } = useSelectedLanguage();
  const canManage = isDefault && canWrite;
  const { availabilityPendingDishId, categories, dishes, setAvailability } = useMenuListController(branchId);
  return (
    <div className="admin-page">
      <MenuSectionTabs current="menu" />
      <PageHeader description="Gestiona las categorías y los platos de esta sucursal." kicker="Carta" title="Menú" />
      {isDefault ? null : <p>Cambia al idioma base para crear contenido o cambiar su configuración.</p>}
      {canWrite && !isDefault ? (
        <div className="admin-toolbar">
          <Button disabled>Nueva categoría</Button>
          <Button disabled>Nuevo plato</Button>
        </div>
      ) : null}
      <EntityListCard
        action={
          canManage ? (
            <Link className="admin-link" to="/menu/categories/new">
              <Icon name="plus" /> Nueva categoría
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
          canManage ? (
            <Link className="admin-link" to="/menu/dishes/new">
              <Icon name="plus" /> Nuevo plato
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
              <span className="admin-list-meta">{formatMoney(dish.price, tenant.restaurant.sourceCurrency)}</span>
              {canToggleAvailability ? (
                <Switch
                  aria-label={`Disponibilidad de ${dish.name}`}
                  checked={dish.isActive}
                  disabled={!isDefault || availabilityPendingDishId === dish.id}
                  label={dish.isActive ? "Disponible" : "Oculto"}
                  onCheckedChange={(checked) => {
                    if (isDefault) setAvailability(dish.id, checked);
                  }}
                />
              ) : (
                <span className="admin-list-meta">{dish.isActive ? "Disponible" : "Oculto"}</span>
              )}
            </div>
          </li>
        ))}
      </EntityListCard>
    </div>
  );
}
export function CategoryEditorPage({ categoryId }: { categoryId?: string }) {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
  if (!branch) return <NoBranchState description="Crea una sucursal para editar su carta." />;
  if (!language.isDefault && language.languageCode)
    return categoryId ? (
      <TranslatedCategoryForm
        key={`${branch.id}:${categoryId}:${language.languageCode}`}
        branchId={branch.id}
        categoryId={categoryId}
        languageCode={language.languageCode}
      />
    ) : (
      <TranslationBlockedMessage entity="una categoría" />
    );
  return (
    <CategoryForm
      branchId={branch.id}
      categoryId={categoryId}
      key={`${branch.id}:${categoryId ?? "new"}:${language.languageCode}`}
    />
  );
}
function CategoryForm({ branchId, categoryId }: { branchId: string; categoryId?: string }) {
  const canWrite = useCan("menu.write");
  const controller = useCategoryEditorController({ branchId, categoryId, languageCodeOverride: null });
  useEditorGuard({
    dirty: controller.form.formState.isDirty || Boolean(controller.image.draft.changed),
    pending: controller.busy,
  });
  if (categoryId && !controller.category) return <NotFoundState />;
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader
        kicker={categoryId ? "Editar categoría" : "Nueva categoría"}
        title={controller.category?.name ?? "Categoría"}
      />
      <FormProvider {...controller.form}>
        <FormShell
          operation={controller.operation}
          busy={controller.busy}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <div className="admin-form-grid">
            <FormTextInput<CategoryFormValues> label="Nombre" name="name" />
            <FormTextarea<CategoryFormValues> label="Descripción" name="description" rows={3} />
            <SingleImageUploadControl
              disabled={controller.busy}
              draft={controller.image.draft}
              label="Imagen de categoría"
              onRemove={controller.image.remove}
              onSelect={controller.image.selectFile}
            />
            <FormCheckbox<CategoryFormValues> label="Categoría activa" name="isActive" />
          </div>
        </FormShell>
      </FormProvider>
    </div>
  );
}
function TranslatedCategoryForm({
  branchId,
  categoryId,
  languageCode,
}: {
  branchId: string;
  categoryId: string;
  languageCode: string;
}) {
  const canTranslate = useCan("languages.write");
  const controller = useCategoryEditorController({ branchId, categoryId, languageCodeOverride: null });
  const translation = useTranslationForm({ branchId, languageCode });
  const initialValues = useMemo(
    () => ({
      description: translation.value({
        entityType: "category",
        entityId: categoryId,
        field: "description",
        fallback: controller.category?.description ?? "",
      }),
      isActive: controller.category?.isActive ?? true,
      name: translation.value({
        entityType: "category",
        entityId: categoryId,
        field: "name",
        fallback: controller.category?.name ?? "",
      }),
    }),
    [categoryId, controller.category, translation],
  );
  useEffect(() => {
    if (!controller.form.formState.isDirty) controller.form.reset(initialValues);
  }, [controller.form, initialValues]);
  useEditorGuard({ dirty: controller.form.formState.isDirty, pending: translation.pending });
  const submit = async () => {
    if (!canTranslate || !(await controller.form.trigger(["name", "description"]))) return;
    const values = controller.form.getValues();
    const rows = [
      translation.saveRow({ entityType: "category", entityId: categoryId, field: "name", value: values.name }),
      translation.saveRow({
        entityType: "category",
        entityId: categoryId,
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
  if (!controller.category) return <NotFoundState />;
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader
        description="Edita los textos de esta categoría. El resto de la configuración se mantiene en el idioma base."
        kicker="Editar categoría"
        title={controller.category.name}
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
            <FormTextInput<CategoryFormValues> disabled={!canTranslate} label="Nombre" name="name" />
            <FormTextarea<CategoryFormValues>
              disabled={!canTranslate}
              label="Descripción"
              name="description"
              rows={3}
            />
            <SingleImageUploadControl
              disabled
              draft={controller.image.draft}
              label="Imagen de categoría (idioma base)"
              onRemove={controller.image.remove}
              onSelect={controller.image.selectFile}
            />
            <FormCheckbox<CategoryFormValues> disabled label="Categoría activa (idioma base)" name="isActive" />
          </div>
        </FormShell>
      </FormProvider>
    </div>
  );
}
export function DishEditorPage({ dishId }: { dishId?: string }) {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
  if (!branch) return <NoBranchState description="Crea una sucursal para editar su carta." />;
  if (!language.isDefault && language.languageCode)
    return dishId ? (
      <TranslatedDishForm
        key={`${branch.id}:${dishId}:${language.languageCode}`}
        branchId={branch.id}
        dishId={dishId}
        languageCode={language.languageCode}
      />
    ) : (
      <TranslationBlockedMessage entity="un plato" />
    );
  return dishId ? (
    <ExistingDish branchId={branch.id} dishId={dishId} key={`${branch.id}:${dishId}:${language.languageCode}`} />
  ) : (
    <DishForm branchId={branch.id} dish={null} key={branch.id} />
  );
}
function ExistingDish({ branchId, dishId }: { branchId: string; dishId: string }) {
  const { languageCode } = useSelectedLanguage();
  const dish = useSuspenseQuery(getDishDetailQueryOptions({ dishId, languageCode, trpc })).data;
  return <DishForm branchId={branchId} dish={dish} />;
}
function DishComboFields({
  canTranslate = true,
  translation = false,
}: {
  canTranslate?: boolean;
  translation?: boolean;
}) {
  const { control } = useFormContext<DishFormValues>();
  const comboEnabled = useWatch({ control, name: "comboEnabled" });
  const comboSwitch = useController({ control, name: "comboEnabled" });
  return (
    <div className="admin-combo-fields">
      <Switch
        checked={Boolean(comboSwitch.field.value)}
        disabled={translation || !canTranslate}
        label={translation ? "Disponible en combo (idioma base)" : "Disponible en combo"}
        onCheckedChange={comboSwitch.field.onChange}
      />
      {comboEnabled ? (
        <div className="admin-form-grid">
          <FormTextInput<DishFormValues>
            disabled={translation || !canTranslate}
            inputMode="decimal"
            label={translation ? "Precio total del combo (idioma base)" : "Precio total del combo"}
            name="comboPrice"
          />
          <FormTextarea<DishFormValues>
            disabled={!canTranslate}
            label="Descripción del combo"
            maxLength={2000}
            name="comboDescription"
            rows={3}
          />
        </div>
      ) : null}
    </div>
  );
}
function DishForm({ branchId, dish }: { branchId: string; dish: DishDetail | null }) {
  const canWrite = useCan("menu.write");
  const controller = useDishEditorController({ branchId, dish });
  useEditorGuard({
    dirty: controller.form.formState.isDirty || Boolean(controller.image.draft.changed),
    pending: controller.busy,
  });
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader kicker={dish ? "Editar plato" : "Nuevo plato"} title={dish?.name ?? "Plato"} />
      <FormProvider {...controller.form}>
        <FormShell
          operation={controller.operation}
          busy={controller.busy}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <div className="admin-form-grid">
            <FormTextInput<DishFormValues> label="Nombre" name="name" />
            <FormSelect<DishFormValues> label="Categoría" name="categoryId" options={controller.categoryOptions} />
            <FormTextInput<DishFormValues> inputMode="decimal" label="Precio" name="price" />
            <SingleImageUploadControl
              disabled={controller.busy}
              draft={controller.image.draft}
              label="Imagen del plato"
              onRemove={controller.image.remove}
              onSelect={controller.image.selectFile}
            />
            <FormTextarea<DishFormValues> label="Descripción" name="description" rows={3} />
            <DishComboFields />
            <div className="admin-choice-grid">
              <FormCheckbox<DishFormValues> label="Activo" name="isActive" />
              <FormCheckbox<DishFormValues> label="Recomendado" name="isRecommended" />
              <FormCheckbox<DishFormValues> label="Destacado" name="isFeatured" />
            </div>
          </div>
          <FormChipGroup<DishFormValues> label="Etiquetas" name="tagIds" options={controller.tagOptions} />
          <FormChipGroup<DishFormValues> label="Alérgenos" name="allergenIds" options={controller.allergenOptions} />
          <FormChipGroup<DishFormValues> label="Extras" name="extraIngredientIds" options={controller.extraOptions} />
        </FormShell>
      </FormProvider>
    </div>
  );
}
function TranslatedDishForm({
  branchId,
  dishId,
  languageCode,
}: {
  branchId: string;
  dishId: string;
  languageCode: string;
}) {
  const canTranslate = useCan("languages.write");
  const { data: dish } = useSuspenseQuery(getDishDetailQueryOptions({ dishId, trpc }));
  const controller = useDishEditorController({ branchId, dish, languageCodeOverride: null });
  const translation = useTranslationForm({ branchId, languageCode });
  const [relatedValues, setRelatedValues] = useState<Record<string, string>>({});
  const related = translation.rows.filter(
    (row) =>
      row.dishId === dishId || (row.entityType === "ingredient" && dish.extraIngredientIds.includes(row.entityId)),
  );
  const initialValues = useMemo(
    () => ({
      ...toDishFormValues(dish),
      description: translation.value({
        entityType: "dish",
        entityId: dishId,
        field: "description",
        fallback: dish.description ?? "",
      }),
      comboDescription: translation.value({
        entityType: "dish",
        entityId: dishId,
        field: "comboDescription",
        fallback: dish.comboDescription ?? "",
      }),
      name: translation.value({ entityType: "dish", entityId: dishId, field: "name", fallback: dish.name }),
    }),
    [dish, dishId, translation],
  );
  useEffect(() => {
    if (!controller.form.formState.isDirty) controller.form.reset(initialValues);
  }, [controller.form, initialValues]);
  useEditorGuard({
    dirty: controller.form.formState.isDirty || Object.keys(relatedValues).length > 0,
    pending: translation.pending,
  });
  const submit = async () => {
    if (!canTranslate || !(await controller.form.trigger(["name", "description", "comboDescription"]))) return;
    const values = controller.form.getValues();
    const ownRows = (["name", "description", "comboDescription"] as const).map((field) =>
      translation.saveRow({ entityType: "dish", entityId: dishId, field, value: values[field] }),
    );
    const rows = [
      ...ownRows,
      ...related.map((row) =>
        translation.saveRow({
          ...row,
          value: relatedValues[`${row.entityType}:${row.entityId}`] ?? translation.value(row),
        }),
      ),
    ].filter((row): row is NonNullable<typeof row> => row !== null);
    if (rows.length === 0) return;
    try {
      await translation.saveRows(rows);
      controller.form.reset(values);
      setRelatedValues({});
      toast.success("Traducción guardada.");
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <div className="admin-page admin-editor-page">
      <PageHeader
        description="Edita los textos de este plato. El resto de la configuración se mantiene en el idioma base."
        kicker="Editar plato"
        title={dish.name}
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
            <FormTextInput<DishFormValues> disabled={!canTranslate} label="Nombre" name="name" />
            <FormSelect<DishFormValues>
              disabled
              label="Categoría (idioma base)"
              name="categoryId"
              options={controller.categoryOptions}
            />
            <FormTextInput<DishFormValues> disabled inputMode="decimal" label="Precio (idioma base)" name="price" />
            <SingleImageUploadControl
              disabled
              draft={controller.image.draft}
              label="Imagen del plato (idioma base)"
              onRemove={controller.image.remove}
              onSelect={controller.image.selectFile}
            />
            <FormTextarea<DishFormValues> disabled={!canTranslate} label="Descripción" name="description" rows={3} />
            <DishComboFields canTranslate={canTranslate} translation />
            <div className="admin-choice-grid">
              <FormCheckbox<DishFormValues> disabled label="Activo (idioma base)" name="isActive" />
              <FormCheckbox<DishFormValues> disabled label="Recomendado (idioma base)" name="isRecommended" />
              <FormCheckbox<DishFormValues> disabled label="Destacado (idioma base)" name="isFeatured" />
            </div>
          </div>
          <FormChipGroup<DishFormValues>
            disabled
            label="Etiquetas (idioma base)"
            name="tagIds"
            options={controller.tagOptions}
          />
          <FormChipGroup<DishFormValues>
            disabled
            label="Alérgenos (idioma base)"
            name="allergenIds"
            options={controller.allergenOptions}
          />
          <FormChipGroup<DishFormValues>
            disabled
            label="Extras (idioma base)"
            name="extraIngredientIds"
            options={controller.extraOptions}
          />
          {related.map((row) => (
            <Field
              key={`${row.entityType}:${row.entityId}`}
              label={`${row.entityType === "ingredient" ? "Extra" : "Variante"} · ${row.text}`}
            >
              <Input
                disabled={!canTranslate || translation.pending}
                value={relatedValues[`${row.entityType}:${row.entityId}`] ?? translation.value(row)}
                onValueChange={(value) =>
                  setRelatedValues((current) => ({ ...current, [`${row.entityType}:${row.entityId}`]: value }))
                }
              />
            </Field>
          ))}
        </FormShell>
      </FormProvider>
    </div>
  );
}

function TranslationBlockedMessage({ entity }: { entity: string }) {
  return (
    <div className="admin-page">
      <PageHeader kicker="Idioma traducido" title="Acción disponible en el idioma base" />
      <p>Cambia al idioma base para crear {entity} o modificar su configuración.</p>
    </div>
  );
}
