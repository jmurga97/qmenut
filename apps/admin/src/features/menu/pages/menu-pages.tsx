import { Badge, Button, ConfirmAction, InlineMessage, Input, Switch } from "@jmurga97/components";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, Outlet } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { Fragment, Suspense, useState } from "react";
import { FormProvider, useFieldArray, useFormContext, useWatch } from "react-hook-form";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { FormCheckbox } from "~/shared/components/forms/adapters/form-checkbox";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormTextarea } from "~/shared/components/forms/adapters/form-textarea";
import { FormChipGroup } from "~/shared/components/forms/form-chip-group";
import { FormShell } from "~/shared/components/forms/form-shell";
import { DetailEmpty, MasterDetail } from "~/shared/components/master-detail";
import { PageHeader } from "~/shared/components/page-header";
import { SectionTabs } from "~/shared/components/section-tabs";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NotFoundState } from "~/shared/components/state/not-found-state";
import { useCan } from "~/shared/hooks/use-can";
import { useEditorGuard } from "~/shared/hooks/use-editor-guard";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { SingleImageUploadControl } from "~/shared/images/single-image-upload-control";
import { formatMoney } from "~/shared/services/money";
import { DAYS } from "~/shared/services/week-time";

import { getDishDetailQueryOptions } from "../api";
import {
  useCategoryEditorController,
  useDishEditorController,
  useMenuListController,
} from "../hooks/use-menu-controllers";
import { MAX_DISH_VARIANTS } from "../types";

import type { DishDetail, CategoryFormValues, DishFormValues } from "../types";

const MENU_TABS = [
  { label: i18n.t("menu___Platos"), to: "/menu/dishes" },
  { label: i18n.t("menu___Categorías"), to: "/menu/categories" },
  { label: i18n.t("menu___Extras"), to: "/menu/extras" },
] as const;
export function MenuLayout() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para gestionar su carta.")} />;
  return (
    <div className={"ming-page admin-page"}>
      <PageHeader
        description={i18n.t("menu___Gestiona las categorías y los platos de esta sucursal.")}
        kicker={i18n.t("menu___Carta")}
        title={i18n.t("menu___Menú")}
      />
      <SectionTabs ariaLabel={i18n.t("menu___Secciones de la carta")} tabs={MENU_TABS} />
      <Outlet />
    </div>
  );
}
function CreateButton({ label, to }: { label: string; to: "/menu/categories/new" | "/menu/dishes/new" }) {
  const canWrite = useCan("menu.write");
  if (!canWrite) return null;
  return (
    <Button nativeButton={false} render={<Link to={to} />} size={"sm"} variant={"secondary"}>
      {label}
    </Button>
  );
}
export function DishesLayout() {
  const branch = useSelectedBranch();
  if (!branch) return null;
  return (
    <MasterDetail
      list={
        <Suspense fallback={<CardSkeleton rows={5} title={i18n.t("menu___Platos")} />}>
          <DishList branchId={branch.id} />
        </Suspense>
      }
    />
  );
}
export function DishesIndex() {
  return <DetailEmpty text={i18n.t("menu___Selecciona un plato para editarlo o crea uno nuevo.")} />;
}
function DishList({ branchId }: { branchId: string }) {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const canToggleAvailability = useCan("menu.toggleDishAvailability");
  const { categories, dishes, setAvailability } = useMenuListController(branchId);
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const matches = dishes.filter((dish) => dish.name.toLowerCase().includes(query));
  const groups = categories
    .map((category) => ({ category, dishes: matches.filter((dish) => dish.categoryId === category.id) }))
    .filter((group) => group.dishes.length > 0);
  return (
    <EntityListCard
      action={
        <div className={"admin-toolbar-controls"}>
          <Input
            aria-label={i18n.t("menu___Buscar plato")}
            placeholder={i18n.t("menu___Buscar plato")}
            type={"search"}
            value={search}
            onValueChange={setSearch}
          />
          <CreateButton label={i18n.t("menu___Crear plato")} to={"/menu/dishes/new"} />
        </div>
      }
      count={matches.length}
      emptyText={query ? i18n.t("menu___Ningún plato coincide con la búsqueda.") : i18n.t("menu___Aún no hay platos.")}
      title={i18n.t("menu___Platos")}
    >
      {groups.map(({ category, dishes: categoryDishes }) => (
        <Fragment key={category.id}>
          <li className="admin-list-group ming-eyebrow">{category.name}</li>
          {categoryDishes.map((dish) => (
            <li className="admin-list-item" key={dish.id}>
              <div className="admin-list-text">
                <Link
                  className={"admin-link admin-list-label"}
                  params={{ dishId: dish.id }}
                  to={"/menu/dishes/$dishId"}
                >
                  {dish.name}
                </Link>
                <span className="admin-list-meta">{formatMoney(dish.price, tenant.restaurant.sourceCurrency)}</span>
              </div>
              {canToggleAvailability ? (
                <Switch
                  aria-label={i18n.t("menu___Disponibilidad de {{name}}", { name: dish.name })}
                  checked={dish.isActive}
                  onCheckedChange={(checked) => setAvailability(dish.id, checked)}
                />
              ) : (
                <span className="admin-list-meta">
                  {dish.isActive ? i18n.t("menu___Disponible") : i18n.t("menu___Oculto")}
                </span>
              )}
            </li>
          ))}
        </Fragment>
      ))}
    </EntityListCard>
  );
}
export function CategoriesLayout() {
  const branch = useSelectedBranch();
  if (!branch) return null;
  return (
    <MasterDetail
      list={
        <Suspense fallback={<CardSkeleton title={i18n.t("menu___Categorías")} />}>
          <CategoryList branchId={branch.id} />
        </Suspense>
      }
    />
  );
}
export function CategoriesIndex() {
  return <DetailEmpty text={i18n.t("menu___Selecciona una categoría para editarla o crea una nueva.")} />;
}
function CategoryList({ branchId }: { branchId: string }) {
  const { categories, moveCategory } = useMenuListController(branchId);
  const canWrite = useCan("menu.write");
  return (
    <EntityListCard
      action={<CreateButton label={i18n.t("menu___Crear categoría")} to={"/menu/categories/new"} />}
      count={categories.length}
      emptyText={i18n.t("menu___Aún no hay categorías.")}
      title={i18n.t("menu___Categorías")}
    >
      {categories.map((category, index) => (
        <li className="admin-list-item" key={category.id}>
          <Link
            className={"admin-link admin-list-label"}
            params={{ categoryId: category.id }}
            to={"/menu/categories/$categoryId"}
          >
            {category.name}
          </Link>
          <div className={"admin-list-actions"}>
            <Badge tone={category.isActive ? "success" : "neutral"}>
              {category.isActive ? i18n.t("menu___Activa") : i18n.t("menu___Oculta")}
            </Badge>
            {canWrite ? (
              <>
                <Button
                  aria-label={i18n.t("menu___Subir {{name}}", { name: category.name })}
                  disabled={index === 0}
                  onClick={() => moveCategory(index, -1)}
                  size={"sm"}
                  variant={"ghost"}
                >
                  <ArrowUpIcon aria-hidden={"true"} />
                </Button>
                <Button
                  aria-label={i18n.t("menu___Bajar {{name}}", { name: category.name })}
                  disabled={index === categories.length - 1}
                  onClick={() => moveCategory(index, 1)}
                  size={"sm"}
                  variant={"ghost"}
                >
                  <ArrowDownIcon aria-hidden={"true"} />
                </Button>
              </>
            ) : null}
          </div>
        </li>
      ))}
    </EntityListCard>
  );
}
export function CategoryEditorPage({ categoryId }: { categoryId?: string }) {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para editar su carta.")} />;
  return <CategoryForm branchId={branch.id} categoryId={categoryId} key={`${branch.id}:${categoryId ?? "new"}`} />;
}
function CategoryForm({ branchId, categoryId }: { branchId: string; categoryId?: string }) {
  const canWrite = useCan("menu.write");
  const controller = useCategoryEditorController({ branchId, categoryId });
  useEditorGuard({
    dirty: controller.form.formState.isDirty || Boolean(controller.image.draft.changed),
    pending: controller.busy,
  });
  if (categoryId && !controller.category) return <NotFoundState />;
  return (
    <div className="admin-detail">
      <PageHeader
        headingLevel={2}
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
            <CategoryScheduleFields />
          </div>
        </FormShell>
      </FormProvider>
    </div>
  );
}
function CategoryScheduleFields() {
  const enabled = useWatch<CategoryFormValues, "scheduleEnabled">({ name: "scheduleEnabled" });
  return (
    <>
      <FormCheckbox<CategoryFormValues> label={i18n.t("menu___Mostrar solo en un horario")} name={"scheduleEnabled"} />
      {enabled ? (
        <>
          <FormChipGroup<CategoryFormValues>
            label={i18n.t("menu___Días visibles")}
            name={"scheduleDays"}
            options={DAYS.map((label, index) => ({ id: index + 1, label }))}
          />
          <FormTextInput<CategoryFormValues> label={i18n.t("menu___Desde")} name={"scheduleStart"} type={"time"} />
          <FormTextInput<CategoryFormValues> label={i18n.t("menu___Hasta")} name={"scheduleEnd"} type={"time"} />
        </>
      ) : null}
    </>
  );
}
export function DishEditorPage({ dishId }: { dishId?: string }) {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para editar su carta.")} />;
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
type DishEditorController = ReturnType<typeof useDishEditorController>;

function DishFields({ controller }: { controller: DishEditorController }) {
  const { control } = useFormContext<DishFormValues>();
  const comboEnabled = useWatch({ control, name: "comboEnabled" });
  const variantsEnabled = useWatch({ control, name: "variantsEnabled" });
  return (
    <>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Datos del plato")}</h2>
        <FormTextInput<DishFormValues> label={i18n.t("menu___Nombre")} name={"name"} />
        <div className="admin-form-grid--two">
          <FormSelect<DishFormValues>
            label={i18n.t("menu___Categoría")}
            name={"categoryId"}
            options={controller.categoryOptions}
          />
          {variantsEnabled ? null : (
            <FormTextInput<DishFormValues> inputMode={"decimal"} label={i18n.t("menu___Precio")} name={"price"} />
          )}
        </div>
        <FormTextarea<DishFormValues> label={i18n.t("menu___Descripción")} name={"description"} rows={3} />
        <SingleImageUploadControl
          disabled={controller.busy}
          draft={controller.image.draft}
          label={i18n.t("menu___Imagen del plato")}
          onRemove={controller.image.remove}
          onSelect={controller.image.selectFile}
        />
      </section>
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Visibilidad en la carta")}</h2>
        <div className="admin-choice-grid">
          <FormCheckbox<DishFormValues> label={i18n.t("menu___Activo")} name={"isActive"} />
          <FormCheckbox<DishFormValues> label={i18n.t("menu___Recomendado")} name={"isRecommended"} />
          <FormCheckbox<DishFormValues> label={i18n.t("menu___Destacado")} name={"isFeatured"} />
        </div>
        <p className="admin-copy">
          {i18n.t(
            "menu___La carta pública muestra un único plato estrella: el primer destacado según el orden de la carta.",
          )}
        </p>
      </section>
      <DishVariantsSection />
      <section className="admin-editor-section">
        <h2 className={"ming-section__title"}>{i18n.t("menu___Combo")}</h2>
        <FormCheckbox<DishFormValues> label={i18n.t("menu___Vender como combo")} name={"comboEnabled"} />
        {comboEnabled ? (
          <>
            <FormTextInput<DishFormValues>
              inputMode={"decimal"}
              label={i18n.t("menu___Precio total del combo")}
              name={"comboPrice"}
            />
            <FormTextarea<DishFormValues>
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
          label={i18n.t("menu___Etiquetas")}
          name={"tagIds"}
          options={controller.tagOptions}
        />
        <FormChipGroup<DishFormValues>
          label={i18n.t("menu___Alérgenos")}
          name={"allergenIds"}
          options={controller.allergenOptions}
        />
        <FormChipGroup<DishFormValues>
          label={i18n.t("menu___Extras")}
          name={"extraIngredientIds"}
          options={controller.extraOptions}
        />
      </section>
    </>
  );
}
function DishVariantsSection() {
  const { control, formState } = useFormContext<DishFormValues>();
  const enabled = useWatch({ control, name: "variantsEnabled" });
  const { append, fields, remove } = useFieldArray({ control, name: "variants" });
  const error = formState.errors.variants?.root?.message;
  return (
    <section className="admin-editor-section">
      <h2 className={"ming-section__title"}>{i18n.t("menu___Variantes de precio")}</h2>
      <FormCheckbox<DishFormValues>
        label={i18n.t("menu___Este plato tiene variantes (tamaños)")}
        name={"variantsEnabled"}
      />
      {enabled ? (
        <>
          <FormTextInput<DishFormValues>
            label={i18n.t("menu___Nombre del grupo")}
            maxLength={60}
            name={"variantGroupName"}
          />
          {fields.map((field, index) => (
            <div className="admin-variant-row" key={field.id}>
              <FormTextInput<DishFormValues>
                label={i18n.t("menu___Variante")}
                maxLength={24}
                name={`variants.${index}.name`}
                placeholder={i18n.t("menu___15 cm")}
              />
              <FormTextInput<DishFormValues>
                inputMode={"decimal"}
                label={i18n.t("menu___Precio")}
                name={`variants.${index}.price`}
              />
              <Button
                aria-label={i18n.t("menu___Quitar variante {{index}}", { index: index + 1 })}
                disabled={fields.length <= 2}
                size={"sm"}
                type={"button"}
                variant={"ghost"}
                onClick={() => remove(index)}
              >
                {i18n.t("menu___Quitar")}
              </Button>
            </div>
          ))}
          {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
          <Button
            disabled={fields.length >= MAX_DISH_VARIANTS}
            size={"sm"}
            type={"button"}
            variant={"secondary"}
            onClick={() => append({ name: "", price: "" })}
          >
            {i18n.t("menu___Añadir variante")}
          </Button>
        </>
      ) : null}
      <p className="admin-copy">
        {i18n.t(
          "menu___La carta pública muestra las dos primeras variantes junto al nombre y todas en el detalle del plato. Usa etiquetas cortas (15 cm, S, XXL).",
        )}
      </p>
    </section>
  );
}
function DishForm({ branchId, dish }: { branchId: string; dish: DishDetail | null }) {
  const canWrite = useCan("menu.write");
  const controller = useDishEditorController({ branchId, dish });
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  useEditorGuard({
    dirty: controller.form.formState.isDirty || Boolean(controller.image.draft.changed),
    pending: controller.busy || controller.removing,
  });
  return (
    <div className="admin-detail">
      <PageHeader
        headingLevel={2}
        kicker={dish ? i18n.t("menu___Editar plato") : i18n.t("menu___Nuevo plato")}
        title={dish?.name ?? i18n.t("menu___Plato")}
      />
      <FormProvider {...controller.form}>
        <FormShell
          actions={
            dish ? (
              <Button
                className={"admin-form-actions__start"}
                onClick={() => setConfirmingRemove(true)}
                variant={"destructive"}
              >
                {i18n.t("menu___Eliminar plato")}
              </Button>
            ) : null
          }
          operation={controller.operation}
          busy={controller.busy}
          onCancel={controller.cancel}
          onSubmit={() => void controller.submit()}
          readOnly={!canWrite}
        >
          <DishFields controller={controller} />
        </FormShell>
      </FormProvider>
      <ConfirmAction
        confirmLabel={i18n.t("menu___Eliminar plato")}
        message={i18n.t("menu___«{{name}}» se eliminará de la carta. Esta acción no se puede deshacer.", {
          name: dish?.name ?? i18n.t("menu___Plato"),
        })}
        onConfirm={() => void controller.removeDish()}
        onOpenChange={(open) => {
          if (!open && !controller.removing) setConfirmingRemove(false);
        }}
        open={confirmingRemove}
        pending={controller.removing}
        title={i18n.t("menu___¿Eliminar plato?")}
      />
    </div>
  );
}
