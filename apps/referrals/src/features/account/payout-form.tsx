import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, InlineMessage, Select } from "@jmurga97/components";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "~/lib/trpc";
import { mobileSchema } from "~/shared/fields";
import { TextField } from "~/shared/form-fields";

import type { ReferralOutputs } from "~/lib/trpc";

// Pago Móvil banks (SUDEBAN codes). The label is stored as is, so staff see code and name.
const BANKS = [
  "0102 Banco de Venezuela",
  "0104 Venezolano de Crédito",
  "0105 Mercantil",
  "0108 Provincial",
  "0114 Bancaribe",
  "0115 Exterior",
  "0128 Caroní",
  "0134 Banesco",
  "0137 Sofitasa",
  "0138 Plaza",
  "0146 Bangente",
  "0151 BFC Banco Fondo Común",
  "0156 100% Banco",
  "0157 DelSur",
  "0163 Banco del Tesoro",
  "0166 Banco Agrícola de Venezuela",
  "0168 Bancrecer",
  "0169 R4 Banco Microfinanciero",
  "0171 Banco Activo",
  "0172 Bancamiga",
  "0173 Banco Internacional de Desarrollo",
  "0174 Banplus",
  "0175 Banco Digital de los Trabajadores",
  "0177 Banfanb",
  "0178 N58 Banco Digital",
  "0191 BNC Banco Nacional de Crédito",
].map((label) => ({ id: label, label }));

const payoutSchema = z.object({
  bank: z.string().min(1, "Elige tu banco"),
  idNumber: z
    .string()
    .trim()
    .toUpperCase()
    .transform((value) => value.replaceAll(/[^VEJPG\d]/g, ""))
    .pipe(z.string().regex(/^[VEJPG]\d{5,9}$/, "Usa el formato V12345678")),
  phone: mobileSchema,
});

type PayoutValues = z.input<typeof payoutSchema>;
type Payout = ReferralOutputs["me"]["participant"]["payout"];

export function PayoutForm({ payout }: { payout: Payout }) {
  const queryClient = useQueryClient();
  const form = useForm<PayoutValues, unknown, z.output<typeof payoutSchema>>({
    resolver: zodResolver(payoutSchema),
    defaultValues: { bank: payout?.bank ?? "", idNumber: payout?.idNumber ?? "", phone: payout?.phone ?? "" },
  });
  const save = useMutation(
    trpc.referrals.savePayout.mutationOptions({
      onSuccess: () => {
        toast.success("Datos de Pago Móvil guardados.");
        return queryClient.invalidateQueries({ queryKey: trpc.referrals.me.queryKey() });
      },
    }),
  );

  return (
    <FormProvider {...form}>
      <form
        className="ref-form"
        noValidate
        onSubmit={(event) => void form.handleSubmit((values) => save.mutate(values))(event)}
      >
        {payout ? null : (
          <InlineMessage message="Tienes un referido aprobado. Carga tus datos para que podamos pagarte." tone="info" />
        )}
        <Controller
          control={form.control}
          name="bank"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message} invalid={Boolean(fieldState.error)} label="Banco">
              <Select
                onValueChange={(value) => field.onChange(value ?? "")}
                options={BANKS}
                placeholder="Elige tu banco"
                value={field.value || null}
              />
            </Field>
          )}
        />
        <TextField<PayoutValues> autoComplete="off" label="Cédula" name="idNumber" placeholder="V12345678" />
        <TextField<PayoutValues>
          autoComplete="tel"
          inputMode="tel"
          label="Celular del Pago Móvil"
          name="phone"
          type="tel"
        />
        <div>
          <Button disabled={save.isPending} type="submit">
            {save.isPending ? "Guardando…" : "Guardar datos de pago"}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}
