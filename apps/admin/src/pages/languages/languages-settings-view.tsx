import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { FormProvider, useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";

import { FormCheckbox } from "@components/forms/adapters/form-checkbox";
import { FormSelect } from "@components/forms/adapters/form-select";
import { getErrorMessage } from "@lib/errors";
import { invalidateLanguages } from "@lib/invalidation";
import { trpc } from "@lib/trpc";

import type { LanguageCatalogEntry } from "@lib/api-types";

const formSchema = z.object({
  languageCode: z.string().trim().min(1, { message: "Elige un idioma" }),
  autoTranslate: z.boolean(),
});

type AddLanguageFormValues = z.infer<typeof formSchema>;

export function LanguagesSettingsView() {
  const { data: languages } = useSuspenseQuery(trpc.admin.languages.list.queryOptions());
  const { data: catalog } = useSuspenseQuery(trpc.admin.languages.catalog.queryOptions());

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div className="admin-kicker">Idiomas</div>
        <h2>Idiomas</h2>
        <p>Traduce automáticamente la carta con DeepL y gestiona qué idiomas ve el cliente.</p>
      </header>

      <LanguagesListCard catalog={catalog} languages={languages} />
      <AddLanguageCard catalog={catalog} languages={languages} />
    </div>
  );
}

function catalogLabel(catalog: LanguageCatalogEntry[], code: string): string {
  return catalog.find((entry) => entry.code === code)?.label ?? code.toUpperCase();
}

function isDeeplSupported(catalog: LanguageCatalogEntry[], code: string): boolean {
  return catalog.find((entry) => entry.code === code)?.deeplSupported ?? false;
}

function LanguagesListCard({
  catalog,
  languages,
}: {
  catalog: LanguageCatalogEntry[];
  languages: { defaultLanguageCode: string | null; languages: { languageCode: string; isActive: boolean; isDefault: boolean }[] };
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [pendingCode, setPendingCode] = useState<string | null>(null);

  const setActiveMutation = useMutation(trpc.admin.languages.setActive.mutationOptions());
  const removeMutation = useMutation(trpc.admin.languages.remove.mutationOptions());
  const translateAllMutation = useMutation(trpc.admin.translations.translateAll.mutationOptions());

  async function handleToggleActive(languageCode: string, isActive: boolean) {
    setError(null);

    try {
      await setActiveMutation.mutateAsync({ languageCode, isActive });
      await invalidateLanguages(queryClient, trpc);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  async function handleRemove(languageCode: string) {
    setError(null);

    try {
      await removeMutation.mutateAsync({ languageCode, deleteTranslations: true });
      await invalidateLanguages(queryClient, trpc);
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    }
  }

  async function handleTranslateAll(languageCode: string) {
    setError(null);
    setPendingCode(languageCode);

    try {
      await translateAllMutation.mutateAsync({ languageCode, onlyMissing: true });
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    } finally {
      setPendingCode(null);
    }
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div className="admin-kicker">Activos ({languages.languages.length})</div>
      </div>

      {languages.languages.length === 0 ? (
        <p className="admin-copy">Aún no hay idiomas configurados.</p>
      ) : (
        <ul className="admin-list">
          {languages.languages.map((language) => {
            const deeplSupported = isDeeplSupported(catalog, language.languageCode);
            const isBusy = pendingCode === language.languageCode;

            return (
              <li className="admin-list-item" key={language.languageCode}>
                <Link
                  className="admin-link admin-list-label"
                  params={{ languageCode: language.languageCode }}
                  to="/languages/$languageCode"
                >
                  {catalogLabel(catalog, language.languageCode)}
                </Link>
                <span className="admin-list-meta">
                  {language.isDefault ? "por defecto" : language.isActive ? "activa" : "oculta"}
                  {deeplSupported ? "" : " · solo manual"}
                </span>
                {!language.isDefault ? (
                  <div className="admin-topbar-actions">
                    <mc-button
                      disabled={isBusy}
                      onClick={() => void handleToggleActive(language.languageCode, !language.isActive)}
                      variant="secondary"
                    >
                      {language.isActive ? "Ocultar" : "Activar"}
                    </mc-button>
                    <mc-button
                      disabled={isBusy || !deeplSupported}
                      onClick={() => void handleTranslateAll(language.languageCode)}
                      variant="secondary"
                    >
                      {isBusy ? "Traduciendo…" : "Traducir todo"}
                    </mc-button>
                    <mc-button disabled={isBusy} onClick={() => void handleRemove(language.languageCode)} variant="secondary">
                      Eliminar
                    </mc-button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {error ? <mc-inline-message message={error} tone="error" /> : null}
    </section>
  );
}

function AddLanguageCard({
  catalog,
  languages,
}: {
  catalog: LanguageCatalogEntry[];
  languages: { languages: { languageCode: string }[] };
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const existingCodes = new Set(languages.languages.map((language) => language.languageCode));
  const options = catalog
    .filter((entry) => !existingCodes.has(entry.code))
    .map((entry) => ({
      id: entry.code,
      label: entry.label,
      description: entry.deeplSupported ? "Traducción automática con DeepL" : "Solo traducción manual",
    }));

  const form = useForm<AddLanguageFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { languageCode: "", autoTranslate: true },
  });

  const addMutation = useMutation(trpc.admin.languages.add.mutationOptions());

  async function handleSubmit(values: AddLanguageFormValues) {
    setServerError(null);

    try {
      await addMutation.mutateAsync({
        languageCode: values.languageCode,
        autoTranslate: values.autoTranslate && isDeeplSupported(catalog, values.languageCode),
      });
      await invalidateLanguages(queryClient, trpc);
      form.reset({ languageCode: "", autoTranslate: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  if (options.length === 0) {
    return null;
  }

  return (
    <section className="admin-card">
      <div className="admin-toolbar">
        <div className="admin-kicker">Añadir idioma</div>
      </div>

      <FormProvider {...form}>
        <div className="admin-form-grid">
          <FormSelect<AddLanguageFormValues> label="Idioma" name="languageCode" options={options} required />
          <FormCheckbox<AddLanguageFormValues> label="Traducir automáticamente al añadir" name="autoTranslate" />
        </div>

        {serverError ? <mc-inline-message message={serverError} tone="error" /> : null}

        <div className="admin-topbar-actions">
          <mc-button
            disabled={addMutation.isPending}
            onClick={() => void form.handleSubmit(handleSubmit)()}
            variant="primary"
          >
            {addMutation.isPending ? "Añadiendo…" : "Añadir idioma"}
          </mc-button>
        </div>
      </FormProvider>
    </section>
  );
}
