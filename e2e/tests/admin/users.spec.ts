import { expect, test } from "../../fixtures/test";
import { callTrpcMutation, callTrpcQuery, getTrpcData } from "../../helpers/trpc";

const existingAccount = {
  email: "invite.e2e@test.local",
  name: "Nombre enviado por el formulario",
  roleCode: "staff" as const,
};

test("owner provisions an idempotent global account across restaurants", async ({
  page,
  fineOwner,
  adminRole,
  staff,
}) => {
  const first = await callTrpcMutation(page, "admin.users.create", existingAccount);
  expect(first, first.body).toMatchObject({ ok: true, status: 200 });
  const firstData = getTrpcData<{
    created: boolean;
    invitation: { status: "not_sent" | "sent" | "failed"; errorCode: string | null };
    user: { email: string; membershipId: string; name: string; roleCode: string };
  }>(first);
  expect(firstData.created).toBe(true);
  expect(firstData.user.name).toBe("Cuenta e2e existente");
  expect(firstData.user.email).toBe(existingAccount.email);
  expect(["sent", "failed"]).toContain(firstData.invitation.status);

  const repeated = await callTrpcMutation(page, "admin.users.create", {
    ...existingAccount,
    roleCode: "admin",
  });
  expect(repeated, repeated.body).toMatchObject({ ok: true, status: 200 });
  const repeatedData = getTrpcData<{
    created: boolean;
    user: { membershipId: string; name: string; roleCode: string };
  }>(repeated);
  expect(repeatedData.created).toBe(false);
  expect(repeatedData.user.membershipId).toBe(firstData.user.membershipId);
  expect(repeatedData.user.name).toBe("Cuenta e2e existente");
  expect(repeatedData.user.roleCode).toBe("staff");

  const changedRole = await callTrpcMutation(page, "admin.users.updateRole", {
    membershipId: firstData.user.membershipId,
    roleCode: "admin",
  });
  expect(changedRole, changedRole.body).toMatchObject({ ok: true, status: 200 });

  const deactivated = await callTrpcMutation(page, "admin.users.setActive", {
    isActive: false,
    membershipId: firstData.user.membershipId,
  });
  expect(deactivated, deactivated.body).toMatchObject({ ok: true, status: 200 });
  const reactivated = await callTrpcMutation(page, "admin.users.setActive", {
    isActive: true,
    membershipId: firstData.user.membershipId,
  });
  expect(reactivated, reactivated.body).toMatchObject({ ok: true, status: 200 });

  const resent = await callTrpcMutation(page, "admin.users.resendInvite", {
    membershipId: firstData.user.membershipId,
  });
  expect(resent, resent.body).toMatchObject({ ok: true, status: 200 });
  const resentData = getTrpcData<{ invitation: { status: "sent" | "failed" } }>(resent);
  expect(["sent", "failed"]).toContain(resentData.invitation.status);

  const secondRestaurant = await callTrpcMutation(fineOwner, "admin.users.create", {
    email: existingAccount.email,
    name: "Otro nombre que no debe prevalecer",
    roleCode: "staff",
  });
  expect(secondRestaurant, secondRestaurant.body).toMatchObject({ ok: true, status: 200 });
  const fineUsers = getTrpcData<Array<{ email: string; name: string }>>(
    await callTrpcQuery(fineOwner, "admin.users.list"),
  );
  expect(fineUsers.filter((user) => user.email === existingAccount.email)).toHaveLength(1);
  expect(fineUsers.find((user) => user.email === existingAccount.email)?.name).toBe("Cuenta e2e existente");

  const ownerRoleChange = await callTrpcMutation(page, "admin.users.updateRole", {
    membershipId: "ru_tapas_e2e",
    roleCode: "admin",
  });
  expect(ownerRoleChange, ownerRoleChange.body).toMatchObject({ ok: false, status: 403 });
  const ownerDeactivation = await callTrpcMutation(page, "admin.users.setActive", {
    isActive: false,
    membershipId: "ru_tapas_e2e",
  });
  expect(ownerDeactivation, ownerDeactivation.body).toMatchObject({ ok: false, status: 403 });

  for (const nonOwner of [adminRole, staff]) {
    const response = await callTrpcQuery(nonOwner, "admin.users.list");
    expect(response, response.body).toMatchObject({ ok: false, status: 403 });
  }

  await page.goto("/users", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByRole("heading", { name: "Usuarios" })).toBeVisible();
  await expect(page.getByText("Cuenta e2e existente", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: "Cuenta e2e existente" }).getByText("Admin", { exact: true }),
  ).toBeVisible();

  const addUser = page.getByRole("button", { name: "+ Agregar usuario" });
  await addUser.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Nombre", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
