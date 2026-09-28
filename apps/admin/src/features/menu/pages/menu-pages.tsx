import { Badge, Button, Field, InlineMessage, Input, Switch } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Suspense, useEffect, useMemo, useState } from "react";
import { FormProvider, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
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
import { PageHeader } from "~/shared/components/page-header";
import { CardSkeleton } from "~/shared/components/state/loading-state";
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
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para gestionar su carta.")} />;
  return <MenuList branchId={branch.id} />;
}
export function MenuSectionTabs({ current }: { current: "extras" | "menu" }) {
  return (
    <nav aria-label={i18n.t("menu___Secciones de la carta")} className="admin-tabs">
      <Link
        activeOptions={{ exact: true }}
        aria-current={current === "menu" ? "page" : undefined}
        className={current === "menu" ? "active" : undefined}
        to={"/menu"}
      >
        {i18n.t("menu___Menú")}
      </Link>
      <Link
        aria-current={current === "extras" ? "page" : undefined}
        className={current === "extras" ? "active" : undefined}
        to={"/menu/extras"}
      >
        {i18n.t("menu___Extras")}
      </Link>
    </nav>
  );
}
function MenuList({ branchId }: { branchId: string }) {
  const canWrite = useCan("menu.write");
  const { isDefault } = useSelectedLanguage();
  return (
    <div className={"ming-page admin-page"}>
      <PageHeader
        actions={
          canWrite ? (
            <>
              <Button
                disabled={!isDefault}
                nativeButton={false}
                render={<Link to={"/menu/categories/new"} />}
                variant={"secondary"}
              >
                {i18n.t("menu___Crear categoría")}
              </Button>
              <Button
                disabled={!isDefault}
                nativeButton={false}
                render={<Link to={"/menu/dishes/new"} />}
                variant={"primary"}
              >
                {i18n.t("menu___Crear plato")}
              </Button>
            </>
          ) : null
        }
        description={i18n.t("menu___Gestiona las categorías y los platos de esta sucursal.")}
        kicker={i18n.t("menu___Carta")}
        title={i18n.t("menu___Menú")}
      />
      <MenuSectionTabs current={"menu"} />
      {isDefault ? null : (
        <InlineMessage>
          {i18n.t("menu___Cambia al idioma base para crear contenido o cambiar su configuración.")}
        </InlineMessage>
      )}
      <Suspense
        fallback={
          <>
            <CardSkeleton title={i18n.t("menu___Categorías")} />
            <CardSkeleton rows={5} title={i18n.t("menu___Platos")} />
          </>
        }
      >
        <MenuListCards branchId={branchId} />
      </Suspense>
    </div>
  );
}
function MenuListCards({ branchId }: { branchId: string }) {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const { isDefault } = useSelectedLanguage();
  const { categories, dishes, setAvailability } = useMenuListController(branchId);
  return (
    <>
      <EntityListCard
        action={null}
        count={categories.length}
        emptyText={i18n.t("menu___Aún no hay categorías.")}
        title={i18n.t("menu___Categorías")}
      >
        {categories.map((category) => (
          <li className="admin-list-item" key={category.id}>
            <Link
              className={"admin-link admin-list-label"}
              params={{ categoryId: category.id }}
              to={"/menu/categories/$categoryId"}
            >
              {category.name}
            </Link>
            <Badge tone={category.isActive ? "success" : "neutral"}>
              {category.isActive ? i18n.t("menu___Activa") : i18n.t("menu___Oculta")}
            </Badge>
          </li>
        ))}
      </EntityListCard>
      <EntityListCard
        action={null}
        count={dishes.length}
        emptyText={i18n.t("menu___Aún no hay platos.")}
        title={i18n.t("menu___Platos")}
      >
        {dishes.map((dish) => (
          <li className="admin-list-item" key={dish.id}>
            <div className="admin-list-text">
              <Link className={"admin-link admin-list-label"} params={{ dishId: dish.id }} to={"/menu/dishes/$dishId"}>
                {dish.name}
              </Link>
              <span className="admin-list-meta">{formatMoney(dish.price, tenant.restaurant.sourceCurrency)}</span>
            </div>
            {canToggleAvailability ? (
              <Switch
                aria-label={i18n.t("menu___Disponibilidad de {{name}}", { name: dish.name })}
                checked={dish.isActive}
                disabled={!isDefault}
                label={dish.isActive ? i18n.t("menu___Disponible") : i18n.t("menu___Oculto")}
                onCheckedChange={(checked) => {
                  if (isDefault) setAvailability(dish.id, checked);
                }}
              />
            ) : (
              <span className="admin-list-meta">
                {dish.isActive ? i18n.t("menu___Disponible") : i18n.t("menu___Oculto")}
              </span>
            )}
          </li>
        ))}
      </EntityListCard>
    </>
  );
}
export function CategoryEditorPage({ categoryId }: { categoryId?: string }) {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para editar su carta.")} />;
  if (!language.isDefault && language.languageCode)
    return categoryId ? (
      <TranslatedCategoryForm
        key={`${branch.id}:${categoryId}:${language.languageCode}`}
        branchId={branch.id}
        categoryId={categoryId}
        languageCode={language.languageCode}
      />
    ) : (
      <TranslationBlockedMessage entity={i18n.t("menu___una categoría")} />
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
    <div className={"ming-page admin-page admin-editor-page"}>
      <PageHeader
        kicker={categoryId ? i18n.t("menu___Editar categoría") : i18n.t("menu___Nueva categoría")}
        title={controller.category?.name ?? i18n.t("menu___Categoría")}
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
            <FormTextInput<CategoryFormValues> label={i18n.t("menu___Nombre")} name={"name"} />
            <FormTextarea<CategoryFormValues> label={i18n.t("menu___Descripción")} name={"description"} rows={3} />
            <SingleImageUploadControl
              disabled={controller.busy}
              draft={controller.image.draft}
              label={i18n.t("menu___Imagen de categoría")}
              onRemove={controller.image.remove}
              onSelect={controller.image.selectFile}
            />
            <FormCheckbox<CategoryFormValues> label={i18n.t("menu___Categoría activa")} name={"isActive"} />
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
      toast.success(i18n.t("menu___Traducción guardada."));
    } catch (error) {
      notifyError(error);
    }
  };
  if (!controller.category) return <NotFoundState />;
  return (
    <div className={"ming-page admin-page admin-editor-page"}>
      <PageHeader
        description={i18n.t(
          "menu___Edita los textos de esta categoría. El resto de la configuración se mantiene en el idioma base.",
        )}
        kicker={i18n.t("menu___Editar categoría")}
        title={controller.category.name}
      />
      <FormProvider {...controller.form}>
        <FormShell
          busy={translation.pending}
          onCancel={controller.cancel}
          onSubmit={() => void submit()}
          readOnly={!canTranslate}
          submitLabel={i18n.t("menu___Guardar traducción")}
        >
          <div className="admin-form-grid">
            <FormTextInput<CategoryFormValues> disabled={!canTranslate} label={i18n.t("menu___Nombre")} name={"name"} />
            <FormTextarea<CategoryFormValues>
              disabled={!canTranslate}
              label={i18n.t("menu___Descripción")}
              name={"description"}
              rows={3}
            />
            <SingleImageUploadControl
              disabled
              draft={controller.image.draft}
              label={i18n.t("menu___Imagen de categoría (idioma base)")}
              onRemove={controller.image.remove}
              onSelect={controller.image.selectFile}
            />
            <FormCheckbox<CategoryFormValues>
              disabled
              label={i18n.t("menu___Categoría activa (idioma base)")}
              name={"isActive"}
            />
          </div>
        </FormShell>
      </FormProvider>
    </div>
  );
}
export function DishEditorPage({ dishId }: { dishId?: string }) {
  const branch = useSelectedBranch();
  const language = useSelectedLanguage();
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para editar su carta.")} />;
  if (!language.isDefault && language.languageCode)
    return dishId ? (
      <TranslatedDishForm
        key={`${branch.id}:${dishId}:${language.languageCode}`}
        branchId={branch.id}
        dishId={dishId}
        languageCode={language.languageCode}
      />
    ) : (
      <TranslationBlockedMessage entity={i18n.t("menu___un plato")} />
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
type DishEditorController = ReturnType<typeof useDishEditorController>;

// `locked` = translation mode: only name and descriptions stay editable; the rest belongs to the base language.
function DishFields({
  canEdit = true,
  controller,
  locked = false,
}: {
  canEdit?: boolean;
  controller: DishEditorController;
  locked?: boolean;
}) {
  const { control } = useFormContext<DishFormValues>();
  const comboEnabled = useWatch({ control, name: "comboEnabled" });
  const base = (label: string) => (locked ? i18n.t("menu___{{label}} (idioma base)", { label }) : label);
  return (
    <>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Datos del plato")}</h2>
        <FormTextInput<DishFormValues> disabled={!canEdit} label={i18n.t("menu___Nombre")} name={"name"} />
        <div className="admin-form-grid--two">
          <FormSelect<DishFormValues>
            disabled={locked}
            label={base(i18n.t("menu___Categoría"))}
            name={"categoryId"}
            options={controller.categoryOptions}
          />
          <FormTextInput<DishFormValues>
            disabled={locked}
            inputMode={"decimal"}
            label={base(i18n.t("menu___Precio"))}
            name={"price"}
          />
        </div>
        <FormTextarea<DishFormValues>
          disabled={!canEdit}
          label={i18n.t("menu___Descripción")}
          name={"description"}
          rows={3}
        />
        <SingleImageUploadControl
          disabled={locked || controller.busy}
          draft={controller.image.draft}
          label={base(i18n.t("menu___Imagen del plato"))}
          onRemove={controller.image.remove}
          onSelect={controller.image.selectFile}
        />
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Visibilidad en la carta")}</h2>
        <div className="admin-choice-grid">
          <FormCheckbox<DishFormValues> disabled={locked} label={base(i18n.t("menu___Activo"))} name={"isActive"} />
          <FormCheckbox<DishFormValues>
            disabled={locked}
            label={base(i18n.t("menu___Recomendado"))}
            name={"isRecommended"}
          />
          <FormCheckbox<DishFormValues>
            disabled={locked}
            label={base(i18n.t("menu___Destacado"))}
            name={"isFeatured"}
          />
        </div>
        <p className="admin-copy">
          {i18n.t(
            "menu___La carta pública muestra un único plato estrella: el primer destacado según el orden de la carta.",
          )}
        </p>
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Combo")}</h2>
        <FormCheckbox<DishFormValues>
          disabled={locked}
          label={base(i18n.t("menu___Vender como combo"))}
          name={"comboEnabled"}
        />
        {comboEnabled ? (
          <>
            <FormTextInput<DishFormValues>
              disabled={locked}
              inputMode={"decimal"}
              label={base(i18n.t("menu___Precio total del combo"))}
              name={"comboPrice"}
            />
            <FormTextarea<DishFormValues>
              disabled={!canEdit}
              label={i18n.t("menu___Descripción del combo")}
              maxLength={2000}
              name={"comboDescription"}
              rows={3}
            />
          </>
        ) : null}
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Etiquetas, alérgenos y extras")}</h2>
        <FormChipGroup<DishFormValues>
          disabled={locked}
          label={base(i18n.t("menu___Etiquetas"))}
          name={"tagIds"}
          options={controller.tagOptions}
        />
        <FormChipGroup<DishFormValues>
          disabled={locked}
          label={base(i18n.t("menu___Alérgenos"))}
          name={"allergenIds"}
          options={controller.allergenOptions}
        />
        <FormChipGroup<DishFormValues>
          disabled={locked}
          label={base(i18n.t("menu___Extras"))}
          name={"extraIngredientIds"}
          options={controller.extraOptions}
        />
      </section>
    </>
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
    <div className={"ming-page admin-page admin-editor-page"}>
      <PageHeader
        kicker={dish ? i18n.t("menu___Editar plato") : i18n.t("menu___Nuevo plato")}
        title={dish?.name ?? i18n.t("menu___Plato")}
      />
      <FormProvider {...controller.form}>
        <FormShell
          operation={controller.operation}
          busy={controller.busy}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <DishFields controller={controller} />
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
      toast.success(i18n.t("menu___Traducción guardada."));
    } catch (error) {
      notifyError(error);
    }
  };
  return (
    <div className={"ming-page admin-page admin-editor-page"}>
      <PageHeader
        description={i18n.t(
          "menu___Edita los textos de este plato. El resto de la configuración se mantiene en el idioma base.",
        )}
        kicker={i18n.t("menu___Editar plato")}
        title={dish.name}
      />
      <FormProvider {...controller.form}>
        <FormShell
          busy={translation.pending}
          onCancel={controller.cancel}
          onSubmit={() => void submit()}
          readOnly={!canTranslate}
          submitLabel={i18n.t("menu___Guardar traducción")}
        >
          <DishFields canEdit={canTranslate} controller={controller} locked />
          {related.length > 0 ? (
            <section className="admin-editor-section">
              <h2 className={"ming-section__title"}>{i18n.t("menu___Extras y variantes")}</h2>
              {related.map((row) => (
                <Field
                  key={`${row.entityType}:${row.entityId}`}
                  label={`${row.entityType === "ingredient" ? i18n.t("menu___Extra") : i18n.t("menu___Variante")} · ${row.text}`}
                  optionalLabel={i18n.t("shared___Optional")}
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
            </section>
          ) : null}
        </FormShell>
      </FormProvider>
    </div>
  );
}

function TranslationBlockedMessage({ entity }: { entity: string }) {
  return (
    <div className={"ming-page admin-page"}>
      <PageHeader
        kicker={i18n.t("menu___Idioma traducido")}
        title={i18n.t("menu___Acción disponible en el idioma base")}
      />
      <p className="admin-copy">
        {i18n.t("menu___Cambia al idioma base para crear")} {entity} {i18n.t("menu___o modificar su configuración.")}
      </p>
    </div>
  );
}
