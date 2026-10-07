import { Badge, Button, ConfirmAction, Input, Switch } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";

import { i18n } from "~/lib/i18n";
import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { CardSkeleton } from "~/shared/components/state/loading-state";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "~/shared/services/money";

import { getIngredientMutationOptions, getMenuIngredientsQueryOptions } from "../api";

import type { RouterOutputs } from "~/lib/trpc";

type Ingredient = RouterOutputs["admin"]["menu"]["taxonomy"]["ingredients"][number];
type IngredientDraft = { isActive: boolean; name: string; price: string };

export function MenuExtrasPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description={i18n.t("menu___Crea una sucursal para gestionar sus extras.")} />;
  return <ExtrasPage />;
}

function ExtrasPage() {
  return (
    <Suspense fallback={<CardSkeleton rows={5} title={i18n.t("menu___Ingredientes opcionales")} />}>
      <ExtrasCatalog />
    </Suspense>
  );
}

function ExtrasCatalog() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const canEdit = useCan("menu.write");
  const queryClient = useQueryClient();
  const ingredients = useSuspenseQuery(getMenuIngredientsQueryOptions({ trpc })).data;
  const mutations = getIngredientMutationOptions({ queryClient, trpc });
  const create = useMutation(mutations.create);
  const update = useMutation(mutations.update);
  const remove = useMutation(mutations.remove);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Ingredient | null>(null);
  const [draft, setDraft] = useState<IngredientDraft | null>(null);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("0");
  const busy = create.isPending || update.isPending || remove.isPending;

  function startEditing(ingredient: Ingredient) {
    setEditingId(ingredient.id);
    setDraft({ isActive: ingredient.isActive, name: ingredient.name, price: formatMoneyInput(ingredient.price) });
  }

  function cancelEditing() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveIngredient(ingredientId: string) {
    if (!draft) return;
    const name = draft.name.trim();
    const price = parseMoneyInput(draft.price);
    if (!name || !Number.isSafeInteger(price) || price < 0) {
      toast.error(i18n.t("menu___Revisa el nombre y el precio del extra."));
      return;
    }
    try {
      await update.mutateAsync({ ingredientId, data: { isActive: draft.isActive, name, price } });
      cancelEditing();
      toast.success(i18n.t("menu___Extra actualizado."));
    } catch (error) {
      notifyError(error);
    }
  }

  async function createIngredient() {
    const name = newName.trim();
    const price = parseMoneyInput(newPrice);
    if (!name || !Number.isSafeInteger(price) || price < 0) {
      toast.error(i18n.t("menu___Revisa el nombre y el precio del extra."));
      return;
    }
    try {
      await create.mutateAsync({ isActive: true, name, price });
      setNewName("");
      setNewPrice("0");
      toast.success(i18n.t("menu___Extra añadido."));
    } catch (error) {
      notifyError(error);
    }
  }

  async function archiveIngredient(ingredient: Ingredient) {
    try {
      await remove.mutateAsync({ ingredientId: ingredient.id });
      if (editingId === ingredient.id) cancelEditing();
      setArchiveTarget(null);
      toast.success(i18n.t("menu___Extra archivado."));
    } catch (error) {
      notifyError(error);
    }
  }

  return (
    <>
      <section aria-labelledby={"menu-extras-title"} className={"admin-card admin-table-card"}>
        <div className="admin-toolbar">
          <div>
            <div className="admin-kicker">
              {i18n.t("menu___Catálogo de extras (")}
              {ingredients.length})
            </div>
            <h2 className={"ming-section__title"} id={"menu-extras-title"}>
              {i18n.t("menu___Ingredientes opcionales")}
            </h2>
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope={"col"}>{i18n.t("menu___Nombre")}</th>
                <th scope={"col"}>{i18n.t("menu___Precio")}</th>
                <th scope={"col"}>{i18n.t("menu___Estado")}</th>
                <th scope={"col"}>
                  <span className="admin-sr-only">{i18n.t("menu___Acciones")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {canEdit ? (
                <tr className="admin-table-create-row">
                  <td>
                    <Input
                      aria-label={i18n.t("menu___Nombre del nuevo extra")}
                      onValueChange={setNewName}
                      placeholder={i18n.t("menu___Nuevo extra")}
                      value={newName}
                    />
                  </td>
                  <td>
                    <Input
                      aria-label={i18n.t("menu___Precio del nuevo extra")}
                      inputMode={"decimal"}
                      onValueChange={setNewPrice}
                      value={newPrice}
                    />
                  </td>
                  <td>
                    <span className="admin-list-meta">{i18n.t("menu___Activo")}</span>
                  </td>
                  <td>
                    <Button
                      disabled={busy || editingId !== null}
                      onClick={() => void createIngredient()}
                      variant={"secondary"}
                    >
                      {i18n.t("menu___Añadir")}
                    </Button>
                  </td>
                </tr>
              ) : null}
              {ingredients.map((ingredient) => {
                const editingDraft = editingId === ingredient.id ? draft : null;
                let rowActions = null;
                if (editingDraft) {
                  rowActions = (
                    <div className="admin-table-actions">
                      <Button disabled={busy} onClick={() => void saveIngredient(ingredient.id)} variant={"primary"}>
                        {i18n.t("menu___Guardar")}
                      </Button>
                      <Button disabled={busy} onClick={cancelEditing} variant={"secondary"}>
                        {i18n.t("menu___Cancelar")}
                      </Button>
                    </div>
                  );
                } else if (canEdit) {
                  rowActions = (
                    <div className="admin-table-actions">
                      <Button
                        aria-label={i18n.t("menu___Editar {{name}}", { name: ingredient.name })}
                        disabled={busy || editingId !== null}
                        onClick={() => startEditing(ingredient)}
                        variant={"secondary"}
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        aria-label={i18n.t("menu___Archivar {{name}}", { name: ingredient.name })}
                        disabled={busy || editingId !== null}
                        onClick={() => setArchiveTarget(ingredient)}
                        variant={"ghost"}
                      >
                        <Trash2Icon />
                      </Button>
                    </div>
                  );
                }
                return (
                  <tr key={ingredient.id}>
                    <td>
                      {editingDraft ? (
                        <Input
                          aria-label={i18n.t("menu___Nombre de {{name}}", { name: ingredient.name })}
                          onValueChange={(name) => setDraft({ ...editingDraft, name })}
                          value={editingDraft.name}
                        />
                      ) : (
                        <span className="admin-table-primary">{ingredient.name}</span>
                      )}
                    </td>
                    <td>
                      {editingDraft ? (
                        <Input
                          aria-label={i18n.t("menu___Precio de {{name}}", { name: ingredient.name })}
                          inputMode={"decimal"}
                          onValueChange={(price) => setDraft({ ...editingDraft, price })}
                          value={editingDraft.price}
                        />
                      ) : (
                        formatMoney(ingredient.price, tenant.restaurant.sourceCurrency)
                      )}
                    </td>
                    <td>
                      {editingDraft ? (
                        <Switch
                          checked={editingDraft.isActive}
                          label={editingDraft.isActive ? i18n.t("menu___Activo") : i18n.t("menu___Inactivo")}
                          onCheckedChange={(isActive) => setDraft({ ...editingDraft, isActive })}
                        />
                      ) : (
                        <Badge tone={ingredient.isActive ? "success" : "neutral"}>
                          {ingredient.isActive ? i18n.t("menu___Activo") : i18n.t("menu___Inactivo")}
                        </Badge>
                      )}
                    </td>
                    <td>{rowActions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ingredients.length === 0 ? (
            <p className="admin-copy">{i18n.t("menu___Aún no hay extras creados.")}</p>
          ) : null}
        </div>
      </section>
      <ConfirmAction
        confirmLabel={i18n.t("menu___Archivar extra")}
        message={i18n.t("menu___«{{name}}» dejará de aparecer como opción para nuevos platos.", {
          name: archiveTarget?.name ?? i18n.t("menu___Este extra"),
        })}
        onConfirm={() => {
          if (archiveTarget) void archiveIngredient(archiveTarget);
        }}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setArchiveTarget(null);
        }}
        open={archiveTarget !== null}
        pending={remove.isPending}
        title={i18n.t("menu___¿Archivar extra?")}
      />
    </>
  );
}
