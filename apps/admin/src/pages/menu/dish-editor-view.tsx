import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { FormCheckbox } from "@components/forms/adapters/form-checkbox";
import { FormSelect } from "@components/forms/adapters/form-select";
import { FormTextInput } from "@components/forms/adapters/form-text-input";
import { FormTextarea } from "@components/forms/adapters/form-textarea";
import { getErrorMessage } from "@lib/errors";
import { invalidateMenu } from "@lib/invalidation";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

import type { DishDetail } from "@lib/api-types";

const formSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
  categoryId: z.string().trim().min(1, { message: "Elige una categoría" }),
  description: z.string().trim(),
  imageUrl: z.string().trim(),
  priceEuros: z
    .string()
    .trim()
    .refine((value) => value !== "" && Number.isFinite(Number(value)) && Number(value) >= 0, {
      message: "Introduce un precio válido",
    }),
  isActive: z.boolean(),
  isRecommended: z.boolean(),
  isFeatured: z.boolean(),
});

type DishFormValues = z.infer<typeof formSchema>;

interface DishEditorViewProps {
  dishId?: string;
}

export function DishEditorView({ dishId }: DishEditorViewProps) {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <p className="admin-copy">Selecciona una sucursal para editar su carta.</p>
      </div>
    );
  }

  if (dishId) {
    return <DishEditLoader branchId={branch.id} dishId={dishId} key={dishId} />;
  }

  return <DishForm branchId={branch.id} detail={null} />;
}

function DishEditLoader({ branchId, dishId }: { branchId: string; dishId: string }) {
  const { data: detail } = useSuspenseQuery(trpc.admin.menu.dishes.detail.queryOptions({ dishId }));
  return <DishForm branchId={branchId} detail={detail} />;
}

function DishForm({ branchId, detail }: { branchId: string; detail: DishDetail | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(detail?.tagIds ?? []);
  const [selectedAllergenIds, setSelectedAllergenIds] = useState<number[]>(detail?.allergenIds ?? []);

  const { data: categories } = useSuspenseQuery(trpc.admin.menu.categories.list.queryOptions({ branchId }));
  const { data: tags } = useSuspenseQuery(trpc.admin.menu.taxonomy.tags.queryOptions());
  const { data: allergens } = useSuspenseQuery(trpc.admin.menu.taxonomy.allergens.queryOptions());

  const form = useForm<DishFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: detail?.name ?? "",
      categoryId: detail?.categoryId ?? "",
      description: detail?.description ?? "",
      imageUrl: detail?.imageUrl ?? "",
      priceEuros: detail ? (detail.price / 100).toString() : "",
      isActive: detail?.isActive ?? true,
      isRecommended: detail?.isRecommended ?? false,
      isFeatured: detail?.isFeatured ?? false,
    },
  });

  const createMutation = useMutation(trpc.admin.menu.dishes.create.mutationOptions());
  const updateMutation = useMutation(trpc.admin.menu.dishes.update.mutationOptions());
  const relationsMutation = useMutation(trpc.admin.menu.dishes.saveRelations.mutationOptions());
  const isSubmitting = createMutation.isPending || updateMutation.isPending || relationsMutation.isPending;

  const categoryOptions = categories.map((category) => ({ id: category.id, label: category.name }));

  async function handleSubmit(values: DishFormValues) {
    setServerError(null);
    const data = {
      categoryId: values.categoryId,
      name: values.name,
      description: values.description || undefined,
      imageUrl: values.imageUrl || undefined,
      price: Math.round(Number(values.priceEuros) * 100),
      position: detail?.position ?? 0,
      isActive: values.isActive,
      isRecommended: values.isRecommended,
      isFeatured: values.isFeatured,
    };

    try {
      const result = detail
        ? await updateMutation.mutateAsync({ dishId: detail.id, branchId, data })
        : await createMutation.mutateAsync({ branchId, data });

      await relationsMutation.mutateAsync({
        dishId: result.id,
        tagIds: selectedTagIds,
        allergenIds: selectedAllergenIds,
        extraIngredientIds: detail?.extraIngredientIds ?? [],
      });

      await invalidateMenu(queryClient, trpc, branchId);
      await navigate({ to: "/menu" });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((current) =>
      current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    );
  }

  function toggleAllergen(allergenId: number) {
    setSelectedAllergenIds((current) =>
      current.includes(allergenId) ? current.filter((id) => id !== allergenId) : [...current, allergenId],
    );
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">{detail ? "Editar plato" : "Nuevo plato"}</div>
        <h3>{detail?.name ?? "Plato"}</h3>
      </header>

      <FormProvider {...form}>
        <div className="admin-editor-shell">
          <div className="admin-form-grid">
            <FormTextInput<DishFormValues> label="Nombre" name="name" required />
            <FormSelect<DishFormValues> label="Categoría" name="categoryId" options={categoryOptions} required />
            <FormTextInput<DishFormValues> hint="En euros, p. ej. 8.50" label="Precio" name="priceEuros" required />
            <FormTextInput<DishFormValues> label="URL de imagen" name="imageUrl" optional />
            <FormTextarea<DishFormValues> label="Descripción" name="description" optional rows={3} />
            <div className="admin-form-grid--two">
              <FormCheckbox<DishFormValues> label="Activo" name="isActive" />
              <FormCheckbox<DishFormValues> label="Recomendado" name="isRecommended" />
              <FormCheckbox<DishFormValues> label="Destacado" name="isFeatured" />
            </div>
          </div>

          <section className="admin-editor-section">
            <div className="admin-kicker">Etiquetas</div>
            <div className="admin-chip-row">
              {tags.map((tag) => {
                const label = tag.label ?? tag.code ?? tag.id;
                const active = selectedTagIds.includes(tag.id);
                return (
                  <button
                    className={active ? "admin-chip admin-chip--active" : "admin-chip"}
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    type="button"
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="admin-editor-section">
            <div className="admin-kicker">Alérgenos</div>
            <div className="admin-chip-row">
              {allergens.map((allergen) => {
                const active = selectedAllergenIds.includes(allergen.id);
                return (
                  <button
                    className={active ? "admin-chip admin-chip--active" : "admin-chip"}
                    key={allergen.id}
                    onClick={() => toggleAllergen(allergen.id)}
                    type="button"
                  >
                    {allergen.code}
                  </button>
                );
              })}
            </div>
          </section>

          {serverError ? <mc-inline-message message={serverError} tone="error" /> : null}

          <div className="admin-topbar-actions">
            <mc-button disabled={isSubmitting} onClick={() => void navigate({ to: "/menu" })} variant="secondary">
              Cancelar
            </mc-button>
            <mc-button disabled={isSubmitting} onClick={() => void form.handleSubmit(handleSubmit)()} variant="primary">
              {isSubmitting ? "Guardando…" : "Guardar"}
            </mc-button>
          </div>
        </div>
      </FormProvider>
    </div>
  );
}
