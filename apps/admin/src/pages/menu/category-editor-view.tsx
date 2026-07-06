import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { FormCheckbox } from "@components/forms/adapters/form-checkbox";
import { FormTextInput } from "@components/forms/adapters/form-text-input";
import { FormTextarea } from "@components/forms/adapters/form-textarea";
import { getErrorMessage } from "@lib/errors";
import { invalidateMenu } from "@lib/invalidation";
import { trpc } from "@lib/trpc";
import { useSelectedBranch } from "@lib/use-selected-branch";

const formSchema = z.object({
  name: z.string().trim().min(1, { message: "El nombre es obligatorio" }),
  description: z.string().trim(),
  imageUrl: z.string().trim(),
  isActive: z.boolean(),
});

type CategoryFormValues = z.infer<typeof formSchema>;

interface CategoryEditorViewProps {
  categoryId?: string;
}

export function CategoryEditorView({ categoryId }: CategoryEditorViewProps) {
  const branch = useSelectedBranch();

  if (!branch) {
    return (
      <div className="admin-page">
        <p className="admin-copy">Selecciona una sucursal para editar su carta.</p>
      </div>
    );
  }

  return <CategoryEditorForm branchId={branch.id} categoryId={categoryId} />;
}

function CategoryEditorForm({ branchId, categoryId }: { branchId: string; categoryId?: string }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: categories } = useSuspenseQuery(trpc.admin.menu.categories.list.queryOptions({ branchId }));
  const existing = categoryId ? categories.find((category) => category.id === categoryId) : undefined;

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: existing?.name ?? "",
      description: existing?.description ?? "",
      imageUrl: existing?.imageUrl ?? "",
      isActive: existing?.isActive ?? true,
    },
  });

  const createMutation = useMutation(trpc.admin.menu.categories.create.mutationOptions());
  const updateMutation = useMutation(trpc.admin.menu.categories.update.mutationOptions());
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  async function handleSubmit(values: CategoryFormValues) {
    setServerError(null);
    const data = {
      name: values.name,
      description: values.description || undefined,
      imageUrl: values.imageUrl || undefined,
      position: existing?.position ?? categories.length,
      isActive: values.isActive,
    };

    try {
      if (categoryId) {
        await updateMutation.mutateAsync({ categoryId, data });
      } else {
        await createMutation.mutateAsync({ branchId, data });
      }

      await invalidateMenu(queryClient, trpc, branchId);
      await navigate({ to: "/menu" });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">{categoryId ? "Editar categoría" : "Nueva categoría"}</div>
        <h3>{existing?.name ?? "Categoría"}</h3>
      </header>

      <FormProvider {...form}>
        <div className="admin-editor-shell">
          <div className="admin-form-grid">
            <FormTextInput<CategoryFormValues> label="Nombre" name="name" required />
            <FormTextarea<CategoryFormValues> label="Descripción" name="description" optional rows={3} />
            <FormTextInput<CategoryFormValues> label="URL de imagen" name="imageUrl" optional />
            <FormCheckbox<CategoryFormValues> label="Categoría activa" name="isActive" />
          </div>

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
