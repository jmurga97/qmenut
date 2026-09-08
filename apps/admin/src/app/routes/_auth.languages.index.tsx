import { createFileRoute } from "@tanstack/react-router";

import { getLanguageCatalogQueryOptions, getLanguagesQueryOptions } from "~/features/languages/api";
import { LanguagesPage } from "~/features/languages/pages/languages-page";

export const Route = createFileRoute("/_auth/languages/")({
  component: LanguagesPage,
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.query({ ...getLanguagesQueryOptions({ trpc: context.trpc }), staleTime: "static" }),
      context.queryClient.query({ ...getLanguageCatalogQueryOptions({ trpc: context.trpc }), staleTime: "static" }),
    ]),
});
