import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { getUserMutationOptions, getUsersQueryOptions } from "~/features/users/api";
import { createUserFormSchema } from "~/features/users/types";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";

import type { AdminUser, CreateUserFormValues } from "~/features/users/types";

export function useUsersController() {
  const queryClient = useQueryClient();
  const query = useQuery(getUsersQueryOptions({ trpc }));
  const { data: tenant } = useQuery(getTenantQueryOptions({ trpc }));
  const mutationOptions = getUserMutationOptions({ queryClient, trpc });
  const createMutation = useMutation(mutationOptions.create);
  const resendMutation = useMutation(mutationOptions.resendInvite);
  const activeMutation = useMutation(mutationOptions.setActive);
  const roleMutation = useMutation(mutationOptions.updateRole);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivationTarget, setDeactivationTarget] = useState<AdminUser | null>(null);
  const form = useForm<CreateUserFormValues>({
    defaultValues: { email: "", name: "", roleCode: "staff" },
    resolver: zodResolver(createUserFormSchema),
  });

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open && !createMutation.isPending) form.reset();
  }

  function create(values: CreateUserFormValues) {
    createMutation.mutate(values, {
      onSuccess: (result) => {
        form.reset();
        setCreateOpen(false);
        if (!result.created) {
          toast.warning(
            "La cuenta ya existía en este restaurante, así que no se envió un acceso nuevo. Puedes reenviarlo desde Acciones.",
          );
          return;
        }
        if (result.invitation.status === "failed") {
          toast.warning(
            "La cuenta y la membresía se crearon, pero no se pudo enviar el acceso. Puedes reenviarlo desde Acciones.",
          );
        } else {
          toast.success("Usuario añadido y acceso enviado.");
        }
      },
    });
  }

  function changeRole(user: AdminUser) {
    roleMutation.mutate(
      { membershipId: user.membershipId, roleCode: user.roleCode === "admin" ? "staff" : "admin" },
      { onSuccess: () => toast.success("Rol actualizado.") },
    );
  }

  function activate(user: AdminUser) {
    activeMutation.mutate(
      { isActive: true, membershipId: user.membershipId },
      { onSuccess: () => toast.success("Membresía reactivada.") },
    );
  }

  function askToDeactivate(user: AdminUser | null) {
    setDeactivationTarget(user);
  }

  function confirmDeactivate() {
    if (!deactivationTarget) return;
    activeMutation.mutate(
      { isActive: false, membershipId: deactivationTarget.membershipId },
      {
        onSuccess: () => {
          toast.success("Membresía desactivada.");
          setDeactivationTarget(null);
        },
      },
    );
  }

  function resendInvite(user: AdminUser) {
    resendMutation.mutate(
      { membershipId: user.membershipId },
      {
        onSuccess: (result) => {
          if (result.invitation.status === "failed") {
            toast.warning("No se pudo enviar el acceso. El último error ha quedado registrado para reintentar.");
            return;
          }
          toast.success("Acceso reenviado.");
        },
      },
    );
  }

  function isPending(membershipId: string): boolean {
    return (
      (roleMutation.isPending && roleMutation.variables.membershipId === membershipId) ||
      (activeMutation.isPending && activeMutation.variables.membershipId === membershipId) ||
      (resendMutation.isPending && resendMutation.variables.membershipId === membershipId)
    );
  }

  return {
    activate,
    askToDeactivate,
    confirmDeactivate,
    create,
    createBusy: createMutation.isPending,
    createOpen,
    deactivationTarget,
    form,
    handleCreateOpenChange,
    isPending,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    resendInvite,
    rows: (query.data ?? []) as AdminUser[],
    tenant,
    updateRole: changeRole,
    updatingActive: activeMutation.isPending,
  };
}
