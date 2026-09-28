import { z } from "zod";

import { i18n } from "~/lib/i18n";

export const manageableRoleOptions = [
  { id: "admin", label: i18n.t("users___Admin") },
  { id: "staff", label: i18n.t("users___Staff") },
] as const;

export const createUserFormSchema = z.object({
  name: z.string().trim().min(1, i18n.t("users___Escribe un nombre")).max(120),
  email: z.email(i18n.t("users___Escribe un correo válido")).trim().max(320),
  roleCode: z.enum(["admin", "staff"]),
});

export type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

export interface AdminUser {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  roleCode: "owner" | "admin" | "staff";
  isActive: boolean;
  inviteStatus: "not_sent" | "sent" | "failed";
  inviteLastErrorCode: string | null;
  inviteLastAttemptAt: number | null;
  inviteSentAt: number | null;
}
