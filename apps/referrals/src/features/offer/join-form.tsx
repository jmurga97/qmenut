import { zodResolver } from "@hookform/resolvers/zod";
import { Button, InlineMessage } from "@jmurga97/components";
import { useMutation } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { trpc } from "~/lib/trpc";
import { EMPTY_RESTAURANT, emailSchema, mobileSchema, restaurantSchema } from "~/shared/fields";
import { RestaurantFields, TextField } from "~/shared/form-fields";

const joinSchema = z.object({
  name: z.string().trim().min(2, "Escribe tu nombre").max(120),
  email: emailSchema,
  phone: mobileSchema,
  restaurant: restaurantSchema,
});

type JoinValues = z.input<typeof joinSchema>;

export function JoinForm({ invited }: { invited: boolean }) {
  const form = useForm<JoinValues, unknown, z.output<typeof joinSchema>>({
    resolver: zodResolver(joinSchema),
    defaultValues: { name: "", email: "", phone: "", restaurant: EMPTY_RESTAURANT },
  });
  const join = useMutation(trpc.referrals.join.mutationOptions());

  if (join.isSuccess) {
    return (
      <InlineMessage
        message={`Te enviamos un enlace a ${join.variables.email}. Ábrelo en las próximas 24 horas para confirmar tu correo: el restaurante queda registrado al confirmarlo.`}
        role="status"
        title="Revisa tu correo"
        tone="success"
      />
    );
  }

  return (
    <FormProvider {...form}>
      <form
        className="ref-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit((values) => join.mutate(values))(event)}
      >
        <fieldset className="ref-fieldset">
          <legend className="ming-section__title">Tus datos</legend>
          <TextField<JoinValues> autoComplete="name" label="Tu nombre" maxLength={120} name="name" />
          <TextField<JoinValues>
            autoComplete="email"
            hint={invited ? "Usa el correo donde recibiste la invitación para conservar tu oferta." : undefined}
            label="Tu correo"
            name="email"
            type="email"
          />
          <TextField<JoinValues> autoComplete="tel" inputMode="tel" label="Tu celular" name="phone" type="tel" />
        </fieldset>
        <fieldset className="ref-fieldset">
          <legend className="ming-section__title">El restaurante</legend>
          <RestaurantFields<JoinValues> prefix="restaurant." />
        </fieldset>
        <p className="ref-note">
          Al enviar, aceptas que contactemos al restaurante en tu nombre. Solo usamos tus datos para este programa.
        </p>
        <Button disabled={join.isPending} size="lg" type="submit">
          {join.isPending ? "Enviando…" : "Presentar restaurante"}
        </Button>
      </form>
    </FormProvider>
  );
}
