import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { trpc } from "~/lib/trpc";

import { getPrintableMenuQueryOptions, getPrintableMenuThemeQueryOptions } from "../api";
import { getPrintableLanguageLabel } from "../languages";

interface UsePrintableMenuControllerInput {
  branchId: string;
  host: string;
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.insertAdjacentElement("beforeend", anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
}

async function fetchTheme(branchId: string, queryClient: ReturnType<typeof useQueryClient>) {
  try {
    return await queryClient.fetchQuery(getPrintableMenuThemeQueryOptions({ branchId, trpc }));
  } catch {
    return null;
  }
}

export function usePrintableMenuController({ branchId, host }: UsePrintableMenuControllerInput) {
  const queryClient = useQueryClient();
  const [localeOverride, setLocaleOverride] = useState("");
  const [generationError, setGenerationError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const menuQuery = useQuery(getPrintableMenuQueryOptions({ host, trpc }));
  const locale = localeOverride || menuQuery.data?.language.default || "";
  const languages =
    menuQuery.data?.language.available.map(({ code }) => ({ id: code, label: getPrintableLanguageLabel(code) })) ?? [];
  const dishCount = menuQuery.data?.categories.reduce((count, category) => count + category.dishes.length, 0) ?? 0;

  async function download() {
    if (!locale || busy) return;
    setBusy(true);
    setGenerationError(null);
    try {
      const [menu, theme] = await Promise.all([
        queryClient.fetchQuery(getPrintableMenuQueryOptions({ host, locale, trpc })),
        fetchTheme(branchId, queryClient),
      ]);
      if (!menu) throw new Error("No se pudo cargar la carta imprimible.");
      const { generatePrintableMenuPdf } = await import("../pdf/generate-printable-menu");
      const blob = await generatePrintableMenuPdf({ host, locale, menu, theme });
      downloadBlob(blob, `menu-${host.replaceAll(".", "-")}-${locale}-a4-plegable.pdf`);
    } catch (error) {
      setGenerationError(error);
    } finally {
      setBusy(false);
    }
  }

  return {
    busy,
    dishCount,
    download,
    error: generationError ?? menuQuery.error,
    languages,
    loading: menuQuery.isPending,
    locale,
    setLocale: setLocaleOverride,
  };
}
