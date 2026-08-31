import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Switch } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";

import * as api from "~/features/exchange-rates/api";
import { exchangeRateFormSchema } from "~/features/exchange-rates/types";
import { trpc } from "~/lib/trpc";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { FormFeedback } from "~/shared/components/forms/form-feedback";

import type { ExchangeRateFormValues } from "~/features/exchange-rates/types";

function formatReferenceDate(value: string | null): string {
  if (!value) return "Sin referencia disponible";

  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDifference(value: number | null): string {
  if (value === null) return "Sin comparación";

  const formatted = Math.abs(value).toLocaleString("es-ES", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  });

  return `${value < 0 ? "−" : "+"}${formatted} %`;
}

export function ExchangeRatesCard() {
  const queryClient = useQueryClient();
  const { data: summary } = useSuspenseQuery(api.getExchangeRatesSummaryQueryOptions({ trpc }));
  const form = useForm<ExchangeRateFormValues>({
    defaultValues: {
      isEnabled: summary.vesPricesEnabled,
      rate: summary.localRate ?? "",
    },
    resolver: zodResolver(exchangeRateFormSchema),
  });
  const save = useMutation(api.getSaveExchangeRateMutationOptions({ queryClient, trpc }));
  const enabled = useController({ control: form.control, name: "isEnabled" });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({ isEnabled: summary.vesPricesEnabled, rate: summary.localRate ?? "" });
    }
  }, [form, summary.localRate, summary.vesPricesEnabled]);

  function submit(values: ExchangeRateFormValues) {
    save.mutate(values, {
      onSuccess: () => form.reset(values),
    });
  }

  return (
    <FormProvider {...form}>
      <section aria-labelledby="admin-dashboard-exchange-rates-title" className="admin-card admin-exchange-rates-card">
        <div className="admin-toolbar">
          <div>
            <div className="admin-kicker">Precios derivados</div>
            <h3 id="admin-dashboard-exchange-rates-title">Tasa VES</h3>
          </div>
          <span className="admin-exchange-rates-unit">VES por 1 USD</span>
        </div>
        <div className="admin-exchange-rates-grid">
          <FormTextInput<ExchangeRateFormValues>
            inputMode="decimal"
            label="Tasa elegida"
            name="rate"
            placeholder="36.50"
          />
          <dl className="admin-exchange-rates-reference">
            <div>
              <dt>Referencia BCV</dt>
              <dd>{summary.bcvRate ? `${summary.bcvRate} VES` : "No disponible"}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{formatReferenceDate(summary.bcvReferenceAt)}</dd>
            </div>
            <div>
              <dt>Diferencia</dt>
              <dd>{formatDifference(summary.differencePercent)}</dd>
            </div>
          </dl>
        </div>
        {summary.localRate === null ? (
          <p className="admin-exchange-rates-empty">Todavía no hay una tasa configurada para este restaurante.</p>
        ) : null}
        {summary.bcvRate === null ? (
          <p className="admin-exchange-rates-note">La referencia de Ming no está disponible en este momento.</p>
        ) : null}
        <div className="admin-exchange-rates-actions">
          <Switch
            aria-label="Mostrar precios en VES"
            checked={enabled.field.value}
            disabled={save.isPending}
            label="Mostrar precios en VES"
            onCheckedChange={enabled.field.onChange}
          />
          <Button disabled={save.isPending} onClick={() => void form.handleSubmit(submit)()} variant="primary">
            {save.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
        <p className="admin-exchange-rates-note">
          La referencia de Ming es informativa. Los precios públicos usan la tasa elegida por el restaurante.
        </p>
        <FormFeedback error={save.error} success={save.isSuccess ? "Tasa VES guardada." : null} />
      </section>
    </FormProvider>
  );
}
