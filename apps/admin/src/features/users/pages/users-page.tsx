import { Dialog } from "@base-ui/react/dialog";
import { Badge, Button, ConfirmAction, DropdownMenu, InlineMessage, ResourceTable } from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { EllipsisIcon } from "lucide-react";
import { useState } from "react";
import { FormProvider } from "react-hook-form";

import { useUsersController } from "~/features/users/hooks/use-users-controller";
import { manageableRoleOptions } from "~/features/users/types";
import { i18n } from "~/lib/i18n";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { PageHeader } from "~/shared/components/page-header";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { AdminUser, CreateUserFormValues } from "~/features/users/types";

const ROLE_LABELS: Record<AdminUser["roleCode"], string> = {
  owner: i18n.t("users___Propietario"),
  admin: i18n.t("users___Administrador"),
  staff: i18n.t("users___Equipo"),
};

function membershipStatus(user: AdminUser) {
  return (
    <Badge tone={user.isActive ? "success" : "neutral"}>
      {user.isActive ? i18n.t("users___Activa") : i18n.t("users___Inactiva")}
    </Badge>
  );
}

function inviteStatus(user: AdminUser) {
  if (user.inviteStatus === "sent") return <Badge tone={"success"}>{i18n.t("users___Enviado")}</Badge>;
  if (user.inviteStatus === "failed") return <Badge tone="error">{i18n.t("users___Error")}</Badge>;
  return <Badge tone={"neutral"}>{i18n.t("users___Pendiente")}</Badge>;
}

function UserRowActions({ controller, user }: { controller: ReturnType<typeof useUsersController>; user: AdminUser }) {
  if (user.roleCode === "owner") return <span className="admin-users-protected">{i18n.t("users___Protegido")}</span>;
  const isOwnMembership = controller.tenant?.membershipId === user.membershipId;
  const pending = controller.isPending(user.membershipId);
  return (
    <DropdownMenu
      align={"end"}
      ariaLabel={i18n.t("users___Acciones para {{name}}", { name: user.name })}
      className={buttonVariants({ iconOnly: true, size: "sm", variant: "ghost" })}
      disabled={pending}
      items={[
        {
          id: "role",
          label: i18n.t("users___Cambiar a {{role}}", {
            role: ROLE_LABELS[user.roleCode === "admin" ? "staff" : "admin"],
          }),
          onSelect: () => controller.updateRole(user),
        },
        ...(user.isActive && !isOwnMembership
          ? [
              {
                id: "deactivate",
                label: <>{i18n.t("users___Desactivar")}</>,
                textValue: i18n.t("users___Desactivar"),
                onSelect: () => controller.askToDeactivate(user),
                separatorBefore: true,
                tone: "destructive" as const,
              },
            ]
          : []),
        ...(user.isActive
          ? []
          : [{ id: "activate", label: i18n.t("users___Reactivar"), onSelect: () => controller.activate(user) }]),
        ...(user.isActive
          ? [
              {
                id: "resend",
                label: i18n.t("users___Reenviar acceso"),
                onSelect: () => controller.resendInvite(user),
                separatorBefore: true,
              },
            ]
          : []),
      ]}
      trigger={<EllipsisIcon />}
    />
  );
}

function CreateUserDialog({ controller }: { controller: ReturnType<typeof useUsersController> }) {
  const [selectPortalContainer, setSelectPortalContainer] = useState<HTMLElement | null>(null);
  return (
    <Dialog.Root open={controller.createOpen} onOpenChange={controller.handleCreateOpenChange}>
      <Dialog.Trigger className={buttonVariants({ size: "md", variant: "primary" })}>
        {i18n.t("users___Agregar usuario")}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="admin-users-dialog-backdrop" />
        <Dialog.Viewport className="admin-users-dialog-viewport">
          <Dialog.Popup className="admin-users-dialog-popup" ref={setSelectPortalContainer}>
            <Dialog.Title>{i18n.t("users___Agregar usuario")}</Dialog.Title>
            <Dialog.Description>
              {i18n.t(
                "users___Crea la cuenta y su acceso a este restaurante. La persona entrará solicitando un OTP, sin contraseña.",
              )}
            </Dialog.Description>
            <FormProvider {...controller.form}>
              <form
                className="admin-users-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void controller.form.handleSubmit(controller.create)();
                }}
              >
                <FormTextInput<CreateUserFormValues>
                  autocomplete={"name"}
                  label={i18n.t("users___Nombre")}
                  name={"name"}
                  maxLength={120}
                />
                <FormTextInput<CreateUserFormValues>
                  autocomplete={"email"}
                  label={i18n.t("users___Correo")}
                  name={"email"}
                  maxLength={320}
                  type={"email"}
                />
                <FormSelect<CreateUserFormValues>
                  label={i18n.t("users___Rol")}
                  name={"roleCode"}
                  options={[...manageableRoleOptions]}
                  portalContainer={selectPortalContainer}
                />
                <InlineMessage
                  message={i18n.t("users___Se enviará un correo con el acceso para iniciar sesión.")}
                  tone={"info"}
                />
                <div className="admin-users-dialog-actions">
                  <Dialog.Close className={buttonVariants({ size: "md", variant: "secondary" })}>
                    {i18n.t("users___Cancelar")}
                  </Dialog.Close>
                  <Button disabled={controller.createBusy} type={"submit"}>
                    {controller.createBusy ? i18n.t("users___Creando…") : i18n.t("users___Crear y enviar acceso")}
                  </Button>
                </div>
              </form>
            </FormProvider>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function UsersPage() {
  const controller = useUsersController();
  const columns: ResourceTableColumn<AdminUser>[] = [
    {
      id: "name",
      header: i18n.t("users___Usuario"),
      render: (user) => (
        <div className="admin-users-identity">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
      ),
      width: "34%",
    },
    { id: "role", header: i18n.t("users___Rol"), render: (user) => ROLE_LABELS[user.roleCode], width: "14%" },
    { id: "membership", header: i18n.t("users___Membresía"), render: membershipStatus, width: "16%" },
    { id: "invite", header: i18n.t("users___Invitación"), render: inviteStatus, width: "18%" },
  ];

  return (
    <div className={"ming-page admin-page admin-users-page"}>
      <div className="admin-users-heading">
        <PageHeader
          description={i18n.t("users___Gestiona quién puede entrar al panel de este restaurante y con qué alcance.")}
          kicker={i18n.t("users___Negocio")}
          title={i18n.t("users___Usuarios")}
        />
        <CreateUserDialog controller={controller} />
      </div>
      <section aria-labelledby="admin-users-list-title" className="admin-users-table-card">
        <div className="admin-toolbar">
          <div>
            <div className="admin-kicker">{i18n.t("users___Accesos del restaurante")}</div>
            <h2 className={"ming-section__title"} id="admin-users-list-title">
              {i18n.t("users___Equipo")}
            </h2>
          </div>
          <span className="admin-users-count">
            {controller.rows.length}{" "}
            {controller.rows.length === 1 ? i18n.t("users___persona") : i18n.t("users___personas")}
          </span>
        </div>
        <ResourceTable
          actionsLabel={i18n.t("users___Acciones")}
          ariaLabel={i18n.t("users___Usuarios y membresías del restaurante")}
          columns={columns}
          density={"comfortable"}
          emptyState={
            <div className="admin-empty-state">
              <h3>{i18n.t("users___Aún no hay usuarios gestionables")}</h3>
              <p>{i18n.t("users___Agrega una cuenta admin o staff para compartir el acceso al panel.")}</p>
            </div>
          }
          getRowId={(user) => user.membershipId}
          loading={controller.isLoading}
          loadingLabel={i18n.t("users___Cargando usuarios…")}
          refetching={controller.isRefetching}
          refetchingLabel={i18n.t("users___Actualizando usuarios…")}
          renderRowActions={(user) => <UserRowActions controller={controller} user={user} />}
          responsive={"stacked"}
          rows={controller.rows}
        />
      </section>
      <ConfirmAction
        cancelLabel={i18n.t("users___Cancelar")}
        confirmLabel={i18n.t("users___Desactivar")}
        message={
          <>
            {i18n.t("users___Se bloqueará el acceso de")} <strong>{controller.deactivationTarget?.name}</strong>{" "}
            {i18n.t("users___a este restaurante.")}
          </>
        }
        onConfirm={controller.confirmDeactivate}
        onOpenChange={(open) => {
          if (!open && !controller.updatingActive) controller.askToDeactivate(null);
        }}
        open={Boolean(controller.deactivationTarget)}
        pending={controller.updatingActive}
        title={i18n.t("users___Desactivar membresía")}
      />
    </div>
  );
}
