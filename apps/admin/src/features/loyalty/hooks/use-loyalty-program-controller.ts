import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient, useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import * as api from "~/features/loyalty/api";
import * as mappers from "~/features/loyalty/mappers";
import { loyaltyProgramFormSchema } from "~/features/loyalty/types";
import { trpc } from "~/lib/trpc";
import { getMenuDishesQueryOptions, getThemeQueryOptions, getTenantQueryOptions } from "~/shared/api";

export function useLoyaltyProgramController(selectedBranchId: string) {
  const queryClient = useQueryClient();
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const { data } = useSuspenseQuery(api.getLoyaltyProgramQueryOptions({ trpc }));
  const dishQueries = useSuspenseQueries({
    queries: tenant.branches.map((branch) => getMenuDishesQueryOptions({ branchId: branch.id, trpc })),
  });
  const selectedBranch = tenant.branches.find((branch) => branch.id === selectedBranchId) ?? tenant.branches[0];
  const themeQuery = useQuery({
    ...getThemeQueryOptions({ branchId: selectedBranchId, trpc }),
    enabled: Boolean(selectedBranch?.customDomain),
  });
  const form = useForm({
    resolver: zodResolver(loyaltyProgramFormSchema),
    defaultValues: mappers.toLoyaltyProgramFormValues(data),
  });
  const rewards = useFieldArray({ control: form.control, name: "rewards" });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const context = { queryClient, trpc };
  const options = api.getLoyaltyMutationOptions(context);
  const saveProgramMutation = useMutation(options.saveProgram);
  const createRewardMutation = useMutation(options.createReward);
  const updateRewardMutation = useMutation(options.updateReward);
  const deleteRewardMutation = useMutation(options.deleteReward);
  async function saveProgram() {
    if (!(await form.trigger(["isActive", "averageTicket"]))) return;
    saveProgramMutation.mutate(mappers.toLoyaltyProgramInput(form.getValues()), {
      onSuccess: () => toast.success("Programa guardado."),
    });
  }
  async function saveReward(index: number) {
    if (!(await form.trigger(`rewards.${index}`))) return;
    const reward = form.getValues(`rewards.${index}`);
    const onSuccess = (result: { id: string }) => {
      form.setValue(`rewards.${index}.rewardId`, result.id);
      setEditingIndex(null);
      toast.success(reward.rewardId ? "Premio actualizado." : "Premio creado.");
    };
    if (reward.rewardId) {
      updateRewardMutation.mutate({ rewardId: reward.rewardId, data: mappers.toRewardInput(reward) }, { onSuccess });
    } else {
      createRewardMutation.mutate({ data: mappers.toRewardInput(reward) }, { onSuccess });
    }
  }
  function cancelReward(index: number) {
    const rewardId = form.getValues(`rewards.${index}.rewardId`);
    const original = data.rewards.find((reward) => reward.id === rewardId);
    if (original) form.setValue(`rewards.${index}`, mappers.toRewardFormValues(original));
    else rewards.remove(index);
    form.clearErrors(`rewards.${index}`);
    setEditingIndex(null);
  }
  function toggleReward(index: number) {
    const reward = form.getValues(`rewards.${index}`);
    if (!reward.rewardId) return;
    const isActive = !reward.isActive;
    updateRewardMutation.mutate(
      { rewardId: reward.rewardId, data: mappers.toRewardInput({ ...reward, isActive }) },
      {
        onSuccess: () => {
          form.setValue(`rewards.${index}.isActive`, isActive);
          toast.success("Premio actualizado.");
        },
      },
    );
  }
  function deleteReward(index: number) {
    const reward = form.getValues(`rewards.${index}`);
    if (!reward.rewardId) return;
    deleteRewardMutation.mutate(
      { rewardId: reward.rewardId },
      {
        onSuccess: () => {
          rewards.remove(index);
          toast.success("Premio eliminado.");
        },
      },
    );
    setDeletingIndex(null);
  }
  function rewardAction(index: number, action: string) {
    const actions: Record<string, () => void> = {
      delete: () => {
        setDeletingIndex(index);
      },
      edit: () => {
        setEditingIndex(index);
      },
      toggle: () => toggleReward(index),
    };
    actions[action]?.();
  }
  const rewardBusy = createRewardMutation.isPending || updateRewardMutation.isPending || deleteRewardMutation.isPending;
  const activeRewards = data.rewards.filter((reward) => reward.isActive);
  const target = activeRewards[0]?.cost ?? 8;
  return {
    activeRewards,
    cancelDeleteReward: () => setDeletingIndex(null),
    confirmDeleteReward: () => {
      if (deletingIndex !== null) deleteReward(deletingIndex);
    },
    deletingIndex,
    deletingRewardName: deletingIndex === null ? null : form.getValues(`rewards.${deletingIndex}.name`),
    dishes: mappers.toDishOptions({ branches: tenant.branches, dishLists: dishQueries.map((query) => query.data) }),
    editingIndex,
    form,
    previewBalance: Math.min(3, target),
    restaurantName: tenant.restaurant.name,
    rewardBusy,
    rewards,
    saveProgramBusy: saveProgramMutation.isPending,
    selectedBranch,
    target,
    theme: themeQuery.data,
    cancelReward,
    newReward: () => {
      rewards.append(mappers.createEmptyRewardFormValues());
      setEditingIndex(rewards.fields.length);
    },
    saveProgram,
    saveReward,
    rewardAction,
  };
}
