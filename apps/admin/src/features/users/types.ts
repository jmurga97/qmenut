import { z } from "zod";

export const manageableRoleOptions = [
  { id: "admin", label: "Admin" },
  { id: "staff", label: "Staff" },
] as const;

export const createUserFormSchema = z.object({
  name: z.string().trim().min(1, "Escribe un nombre").max(120),
  email: z.email("Escribe un correo válido").trim().max(320),
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
