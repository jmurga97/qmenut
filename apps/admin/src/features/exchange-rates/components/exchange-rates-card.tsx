import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Switch } from "@jmurga97/components";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { FormProvider, useController, useForm } from "react-hook-form";
import { toast } from "sonner";

import * as api from "~/features/exchange-rates/api";
import { exchangeRateFormSchema } from "~/features/exchange-rates/types";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { FormTextInput } from "~/shared/components/forms/adapters/form-text-input";
import { formatNumber } from "~/shared/services/format";

import type { ExchangeRateFormValues } from "~/features/exchange-rates/types";

function formatRateInput(value: string | null): string {
  if (!value) return "";
  return new Intl.NumberFormat(i18n.resolvedLanguage ?? "es", {
    maximumFractionDigits: 6,
    useGrouping: false,
  }).format(Number(value));
}

function formatReferenceDate(value: string | null): string {
  if (!value) return i18n.t("exchangeRates___Sin referencia disponible");

  return new Intl.DateTimeFormat(i18n.resolvedLanguage ?? "es", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDifference(value: number | null): string {
  if (value === null) return i18n.t("exchangeRates___Sin comparación");

  const formatted = Math.abs(value).toLocaleString(i18n.resolvedLanguage ?? "es", {
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
      rate: formatRateInput(summary.localRate),
    },
    resolver: zodResolver(exchangeRateFormSchema),
  });
  const save = useMutation(api.getSaveExchangeRateMutationOptions({ queryClient, trpc }));
  const enabled = useController({ control: form.control, name: "isEnabled" });

  useEffect(() => {
    if (!form.formState.isDirty) {
      form.reset({ isEnabled: summary.vesPricesEnabled, rate: formatRateInput(summary.localRate) });
    }
  }, [form, summary.localRate, summary.vesPricesEnabled]);

  function submit(values: ExchangeRateFormValues) {
    save.mutate(values, {
      onSuccess: () => {
        form.reset({ ...values, rate: formatRateInput(values.rate) });
        toast.success(i18n.t("exchangeRates___Tasa VES guardada."));
      },
    });
  }

  return (
    <FormProvider {...form}>
      <section
        aria-labelledby="admin-dashboard-exchange-rates-title"
        className={"admin-card admin-exchange-rates-card"}
      >
        <div className="admin-toolbar">
          <div>
            <div className="admin-kicker">{i18n.t("exchangeRates___Precios derivados")}</div>
            <h2 id="admin-dashboard-exchange-rates-title">{i18n.t("exchangeRates___Tasa VES")}</h2>
          </div>
          <span className="admin-exchange-rates-unit">{i18n.t("exchangeRates___VES por 1 USD")}</span>
        </div>
        <div className="admin-exchange-rates-grid">
          <FormTextInput<ExchangeRateFormValues>
            inputMode={"decimal"}
            label={i18n.t("exchangeRates___Tasa elegida")}
            name={"rate"}
            placeholder={formatRateInput("36.5")}
          />
          <dl className="admin-exchange-rates-reference">
            <div>
              <dt>{i18n.t("exchangeRates___Referencia BCV")}</dt>
              <dd>
                {summary.bcvRate
                  ? `${formatNumber(Number(summary.bcvRate))} VES`
                  : i18n.t("exchangeRates___No disponible")}
              </dd>
            </div>
            <div>
              <dt>{i18n.t("exchangeRates___Fecha")}</dt>
              <dd>{formatReferenceDate(summary.bcvReferenceAt)}</dd>
            </div>
            <div>
              <dt>{i18n.t("exchangeRates___Diferencia")}</dt>
              <dd>{formatDifference(summary.differencePercent)}</dd>
            </div>
          </dl>
        </div>
        {summary.localRate === null ? (
          <p className="admin-exchange-rates-empty">
            {i18n.t("exchangeRates___Todavía no hay una tasa configurada para este restaurante.")}
          </p>
        ) : null}
        {summary.bcvRate === null ? (
          <p className="admin-exchange-rates-note">
            {i18n.t("exchangeRates___La referencia de Ming no está disponible en este momento.")}
          </p>
        ) : null}
        <div className="admin-exchange-rates-actions">
          <Switch
            aria-label={i18n.t("exchangeRates___Mostrar precios en VES")}
            checked={enabled.field.value}
            disabled={save.isPending}
            label={i18n.t("exchangeRates___Mostrar precios en VES")}
            onCheckedChange={enabled.field.onChange}
          />
          <Button disabled={save.isPending} onClick={() => void form.handleSubmit(submit)()} variant={"primary"}>
            {save.isPending ? i18n.t("exchangeRates___Guardando…") : i18n.t("exchangeRates___Guardar")}
          </Button>
        </div>
        <p className="admin-exchange-rates-note">
          {i18n.t(
            "exchangeRates___La referencia de Ming es informativa. Los precios públicos usan la tasa elegida por el restaurante.",
          )}
        </p>
      </section>
    </FormProvider>
  );
}
