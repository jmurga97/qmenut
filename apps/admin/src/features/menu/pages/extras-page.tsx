import { Button, Input, Switch } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { notifyError } from "~/lib/notifications";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { Icon } from "~/shared/components/icon";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useCan } from "~/shared/hooks/use-can";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";
import { useSelectedLanguage } from "~/shared/hooks/use-selected-language";
import { formatMoney, formatMoneyInput, parseMoneyInput } from "~/shared/services/money";

import { getIngredientMutationOptions, getMenuIngredientsQueryOptions } from "../api";
import { MenuSectionTabs } from "./menu-pages";

import type { RouterOutputs } from "~/lib/trpc";

type Ingredient = RouterOutputs["admin"]["menu"]["taxonomy"]["ingredients"][number];
type IngredientDraft = { isActive: boolean; name: string; price: string };

export function MenuExtrasPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para gestionar sus extras." />;
  return <ExtrasCatalog />;
}

function ExtrasCatalog() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const language = useSelectedLanguage();
  const canEdit = useCan("menu.write") && language.isDefault;
  const queryClient = useQueryClient();
  const ingredients = useSuspenseQuery(
    getMenuIngredientsQueryOptions({ languageCode: language.languageCode, trpc }),
  ).data;
  const mutations = getIngredientMutationOptions({ queryClient, trpc });
  const create = useMutation(mutations.create);
  const update = useMutation(mutations.update);
  const remove = useMutation(mutations.remove);
  const [editingId, setEditingId] = useState<string | null>(null);
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
      toast.error("Revisa el nombre y el precio del extra.");
      return;
    }
    try {
      await update.mutateAsync({ ingredientId, data: { isActive: draft.isActive, name, price } });
      cancelEditing();
      toast.success("Extra actualizado.");
    } catch (error) {
      notifyError(error);
    }
  }

  async function createIngredient() {
    const name = newName.trim();
    const price = parseMoneyInput(newPrice);
    if (!name || !Number.isSafeInteger(price) || price < 0) {
      toast.error("Revisa el nombre y el precio del extra.");
      return;
    }
    try {
      await create.mutateAsync({ isActive: true, name, price });
      setNewName("");
      setNewPrice("0");
      toast.success("Extra añadido.");
    } catch (error) {
      notifyError(error);
    }
  }

  async function archiveIngredient(ingredient: Ingredient) {
    if (!window.confirm(`¿Archivar «${ingredient.name}»? Dejará de aparecer como opción para nuevos platos.`)) return;
    try {
      await remove.mutateAsync({ ingredientId: ingredient.id });
      if (editingId === ingredient.id) cancelEditing();
      toast.success("Extra archivado.");
    } catch (error) {
      notifyError(error);
    }
  }

  return (
    <div className="admin-page">
      <div>
        <MenuSectionTabs current="extras" />
        <PageHeader
          description="Gestiona los ingredientes opcionales y asígnalos después a cada plato."
          kicker="Carta"
          title="Extras"
        />
      </div>
      {language.isDefault ? null : <p>Cambia al idioma base para crear o editar extras.</p>}
      <section aria-labelledby="menu-extras-title" className="admin-card admin-table-card">
        <div className="admin-toolbar">
          <div>
            <div className="admin-kicker">Catálogo de extras ({ingredients.length})</div>
            <h3 id="menu-extras-title">Ingredientes opcionales</h3>
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Nombre</th>
                <th scope="col">Precio</th>
                <th scope="col">Estado</th>
                <th scope="col">
                  <span className="admin-sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {canEdit ? (
                <tr className="admin-table-create-row">
                  <td>
                    <Input
                      aria-label="Nombre del nuevo extra"
                      onValueChange={setNewName}
                      placeholder="Nuevo extra"
                      value={newName}
                    />
                  </td>
                  <td>
                    <Input
                      aria-label="Precio del nuevo extra"
                      inputMode="decimal"
                      onValueChange={setNewPrice}
                      value={newPrice}
                    />
                  </td>
                  <td>
                    <span className="admin-list-meta">Activo</span>
                  </td>
                  <td>
                    <Button
                      disabled={busy || editingId !== null}
                      onClick={() => void createIngredient()}
                      variant="secondary"
                    >
                      <Icon name="plus" /> Añadir
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
                      <Button disabled={busy} onClick={() => void saveIngredient(ingredient.id)} variant="primary">
                        Guardar
                      </Button>
                      <Button disabled={busy} onClick={cancelEditing} variant="secondary">
                        Cancelar
                      </Button>
                    </div>
                  );
                } else if (canEdit) {
                  rowActions = (
                    <div className="admin-table-actions">
                      <Button
                        aria-label={`Editar ${ingredient.name}`}
                        disabled={busy || editingId !== null}
                        onClick={() => startEditing(ingredient)}
                        variant="secondary"
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        aria-label={`Archivar ${ingredient.name}`}
                        disabled={busy || editingId !== null}
                        onClick={() => void archiveIngredient(ingredient)}
                        variant="secondary"
                      >
                        <Icon name="trash" />
                      </Button>
                    </div>
                  );
                }
                return (
                  <tr key={ingredient.id}>
                    <td>
                      {editingDraft ? (
                        <Input
                          aria-label={`Nombre de ${ingredient.name}`}
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
                          aria-label={`Precio de ${ingredient.name}`}
                          inputMode="decimal"
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
                          label={editingDraft.isActive ? "Activo" : "Inactivo"}
                          onCheckedChange={(isActive) => setDraft({ ...editingDraft, isActive })}
                        />
                      ) : (
                        <span className={ingredient.isActive ? "admin-status admin-status--active" : "admin-status"}>
                          {ingredient.isActive ? "Activo" : "Inactivo"}
                        </span>
                      )}
                    </td>
                    <td>{rowActions}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {ingredients.length === 0 ? <p className="admin-copy">Aún no hay extras creados.</p> : null}
        </div>
      </section>
    </div>
  );
}
