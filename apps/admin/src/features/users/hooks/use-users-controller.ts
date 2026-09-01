import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";

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
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [inviteFailure, setInviteFailure] = useState<string | null>(null);
  const form = useForm<CreateUserFormValues>({
    defaultValues: { email: "", name: "", roleCode: "staff" },
    resolver: zodResolver(createUserFormSchema),
  });

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open);
    if (!open && !createMutation.isPending) form.reset();
  }

  function create(values: CreateUserFormValues) {
    setActionSuccess(null);
    setInviteFailure(null);
    createMutation.mutate(values, {
      onSuccess: (result) => {
        form.reset();
        setCreateOpen(false);
        if (!result.created) {
          setInviteFailure(
            "La cuenta ya existía en este restaurante, así que no se envió un acceso nuevo. Puedes reenviarlo desde Acciones.",
          );
          return;
        }
        if (result.invitation.status === "failed") {
          setInviteFailure(
            "La cuenta y la membresía se crearon, pero no se pudo enviar el acceso. Puedes reenviarlo desde Acciones.",
          );
        } else {
          setActionSuccess("Usuario añadido y acceso enviado.");
        }
      },
    });
  }

  function changeRole(user: AdminUser) {
    setActionSuccess(null);
    roleMutation.mutate(
      { membershipId: user.membershipId, roleCode: user.roleCode === "admin" ? "staff" : "admin" },
      { onSuccess: () => setActionSuccess("Rol actualizado.") },
    );
  }

  function activate(user: AdminUser) {
    setActionSuccess(null);
    activeMutation.mutate(
      { isActive: true, membershipId: user.membershipId },
      { onSuccess: () => setActionSuccess("Membresía reactivada.") },
    );
  }

  function askToDeactivate(user: AdminUser | null) {
    setDeactivationTarget(user);
  }

  function confirmDeactivate() {
    if (!deactivationTarget) return;
    setActionSuccess(null);
    activeMutation.mutate(
      { isActive: false, membershipId: deactivationTarget.membershipId },
      {
        onSuccess: () => {
          setActionSuccess("Membresía desactivada.");
          setDeactivationTarget(null);
        },
      },
    );
  }

  function resendInvite(user: AdminUser) {
    setActionSuccess(null);
    setInviteFailure(null);
    resendMutation.mutate(
      { membershipId: user.membershipId },
      {
        onSuccess: (result) => {
          if (result.invitation.status === "failed") {
            setInviteFailure("No se pudo enviar el acceso. El último error ha quedado registrado para reintentar.");
            return;
          }
          setActionSuccess("Acceso reenviado.");
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
    actionError: createMutation.error ?? roleMutation.error ?? activeMutation.error ?? resendMutation.error,
    actionSuccess,
    activate,
    askToDeactivate,
    confirmDeactivate,
    create,
    createError: createMutation.error,
    createBusy: createMutation.isPending,
    createOpen,
    deactivationTarget,
    form,
    handleCreateOpenChange,
    inviteFailure,
    isPending,
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    queryError: query.error,
    resendInvite,
    rows: (query.data ?? []) as AdminUser[],
    tenant,
    updateRole: changeRole,
    updatingActive: activeMutation.isPending,
  };
}
