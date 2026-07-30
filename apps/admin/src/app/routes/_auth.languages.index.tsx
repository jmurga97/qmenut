import { createFileRoute } from "@tanstack/react-router";

import { getLanguageCatalogQueryOptions, getLanguagesQueryOptions } from "~/features/languages/api";
import { LanguagesPage } from "~/features/languages/pages/languages-page";

export const Route = createFileRoute("/_auth/languages/")({
  component: LanguagesPage,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(getLanguagesQueryOptions({ trpc: context.trpc })),
      context.queryClient.ensureQueryData(getLanguageCatalogQueryOptions({ trpc: context.trpc })),
    ]),
});
