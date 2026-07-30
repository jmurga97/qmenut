import { z } from "zod";

export const loginFormSchema = z.object({
  email: z.email({ message: "Introduce un email válido" }).trim(),
  otp: z.string().regex(/^\d{6}$/, "Introduce el código de 6 dígitos"),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;
