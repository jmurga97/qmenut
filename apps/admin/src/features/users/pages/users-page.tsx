import { Dialog } from "@base-ui/react/dialog";
import {
  Badge,
  Button,
  ConfirmAction,
  DropdownMenu,
  Field,
  InlineMessage,
  Input,
  ResourceTable,
} from "@jmurga97/components";
import { buttonVariants } from "@jmurga97/components/button";
import { FormProvider } from "react-hook-form";

import { useUsersController } from "~/features/users/hooks/use-users-controller";
import { manageableRoleOptions } from "~/features/users/types";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormFeedback } from "~/shared/components/forms/form-feedback";
import { PageHeader } from "~/shared/components/page-header";

import type { ResourceTableColumn } from "@jmurga97/components";
import type { AdminUser, CreateUserFormValues } from "~/features/users/types";

const ROLE_LABELS: Record<AdminUser["roleCode"], string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
};

function membershipStatus(user: AdminUser) {
  return <Badge tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Activa" : "Inactiva"}</Badge>;
}

function inviteStatus(user: AdminUser) {
  if (user.inviteStatus === "sent") return <Badge tone="success">Enviado</Badge>;
  if (user.inviteStatus === "failed") return <Badge tone="error">Error</Badge>;
  return <Badge tone="neutral">Pendiente</Badge>;
}

function UserRowActions({ controller, user }: { controller: ReturnType<typeof useUsersController>; user: AdminUser }) {
  if (user.roleCode === "owner") return <span className="admin-users-protected">Protegido</span>;
  const isOwnMembership = controller.tenant?.membershipId === user.membershipId;
  const pending = controller.isPending(user.membershipId);
  return (
    <DropdownMenu
      align="end"
      ariaLabel={`Acciones para ${user.name}`}
      className={buttonVariants({ size: "sm", variant: "secondary" })}
      disabled={pending}
      items={[
        {
          id: "role",
          label: `Cambiar a ${user.roleCode === "admin" ? "staff" : "admin"}`,
          onSelect: () => controller.updateRole(user),
        },
        ...(user.isActive && !isOwnMembership
          ? [
              {
                id: "deactivate",
                label: "Desactivar",
                onSelect: () => controller.askToDeactivate(user),
                separatorBefore: true,
                tone: "destructive" as const,
              },
            ]
          : []),
        ...(user.isActive ? [] : [{ id: "activate", label: "Reactivar", onSelect: () => controller.activate(user) }]),
        ...(user.isActive
          ? [
              {
                id: "resend",
                label: "Reenviar acceso",
                onSelect: () => controller.resendInvite(user),
                separatorBefore: true,
              },
            ]
          : []),
      ]}
      trigger="Acciones"
    />
  );
}

function CreateUserDialog({ controller }: { controller: ReturnType<typeof useUsersController> }) {
  return (
    <Dialog.Root open={controller.createOpen} onOpenChange={controller.handleCreateOpenChange}>
      <Dialog.Trigger className={buttonVariants({ size: "md", variant: "primary" })}>+ Agregar usuario</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="admin-users-dialog-backdrop" />
        <Dialog.Viewport className="admin-users-dialog-viewport">
          <Dialog.Popup className="admin-users-dialog-popup">
            <Dialog.Title>Agregar usuario</Dialog.Title>
            <Dialog.Description>
              Crea la cuenta y su acceso a este restaurante. La persona entrará solicitando un OTP, sin contraseña.
            </Dialog.Description>
            <FormProvider {...controller.form}>
              <form
                className="admin-users-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void controller.form.handleSubmit(controller.create)();
                }}
              >
                <FormTextInput<CreateUserFormValues> autocomplete="name" label="Nombre" name="name" maxLength={120} />
                <FormTextInput<CreateUserFormValues>
                  autocomplete="email"
                  label="Correo"
                  name="email"
                  maxLength={320}
                  type="email"
                />
                <FormSelect<CreateUserFormValues> label="Rol" name="roleCode" options={[...manageableRoleOptions]} />
                <Field label="Acceso">
                  <Input readOnly value="Código de un solo uso por correo" />
                </Field>
                <FormFeedback error={controller.createError} />
                <div className="admin-users-dialog-actions">
                  <Dialog.Close className={buttonVariants({ size: "md", variant: "secondary" })}>Cancelar</Dialog.Close>
                  <Button disabled={controller.createBusy} type="submit">
                    {controller.createBusy ? "Creando…" : "Crear y enviar acceso"}
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
      header: "Usuario",
      render: (user) => (
        <div className="admin-users-identity">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
        </div>
      ),
      width: "34%",
    },
    { id: "role", header: "Rol", render: (user) => ROLE_LABELS[user.roleCode], width: "14%" },
    { id: "membership", header: "Membresía", render: membershipStatus, width: "16%" },
    { id: "invite", header: "Invitación", render: inviteStatus, width: "18%" },
  ];

  return (
    <div className="admin-page admin-users-page">
      <div className="admin-users-heading">
        <PageHeader
          description="Gestiona quién puede entrar al panel de este restaurante y con qué alcance."
          kicker="Negocio"
          title="Usuarios"
        />
        <CreateUserDialog controller={controller} />
      </div>
      <FormFeedback error={controller.actionError} success={controller.actionSuccess} />
      {controller.inviteFailure ? (
        <InlineMessage message={controller.inviteFailure} title="La membresía se conserva" tone="warning" />
      ) : null}
      <section aria-labelledby="admin-users-list-title" className="admin-users-table-card">
        <div className="admin-toolbar">
          <div>
            <div className="admin-kicker">Accesos del restaurante</div>
            <h3 id="admin-users-list-title">Equipo</h3>
          </div>
          <span className="admin-users-count">
            {controller.rows.length} {controller.rows.length === 1 ? "persona" : "personas"}
          </span>
        </div>
        <ResourceTable
          ariaLabel="Usuarios y membresías del restaurante"
          columns={columns}
          density="comfortable"
          emptyState={
            <div className="admin-empty-state">
              <h3>Aún no hay usuarios gestionables</h3>
              <p>Agrega una cuenta admin o staff para compartir el acceso al panel.</p>
            </div>
          }
          error={
            controller.queryError ? <InlineMessage message="No se pudo cargar el equipo." tone="error" /> : undefined
          }
          getRowId={(user) => user.membershipId}
          loading={controller.isLoading}
          loadingLabel="Cargando usuarios…"
          refetching={controller.isRefetching}
          renderRowActions={(user) => <UserRowActions controller={controller} user={user} />}
          responsive="stacked"
          rows={controller.rows}
        />
      </section>
      <ConfirmAction
        cancelLabel="Cancelar"
        confirmLabel="Desactivar"
        message={
          <>
            Se bloqueará el acceso de <strong>{controller.deactivationTarget?.name}</strong> a este restaurante.
          </>
        }
        onConfirm={controller.confirmDeactivate}
        onOpenChange={(open) => {
          if (!open && !controller.updatingActive) controller.askToDeactivate(null);
        }}
        open={Boolean(controller.deactivationTarget)}
        pending={controller.updatingActive}
        title="Desactivar membresía"
      />
    </div>
  );
}
