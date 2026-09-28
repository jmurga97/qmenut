import { z } from "zod";

import { i18n } from "~/lib/i18n";

export const loginFormSchema = z.object({
  email: z.email({ message: i18n.t("auth___Introduce un email válido") }).trim(),
  otp: z.string().regex(/^\d{6}$/, i18n.t("auth___Introduce el código de 6 dígitos")),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;
