import { createFileRoute } from "@tanstack/react-router";

import { getLanguageCatalogQueryOptions } from "~/features/languages/api";
import { LanguagesPage } from "~/features/languages/pages/languages-page";
import { getLanguagesQueryOptions, hasSelectedFeature } from "~/shared/api";

export const Route = createFileRoute("/_auth/languages/")({
  component: LanguagesPage,
  loader: async ({ context }) => {
    if (!(await hasSelectedFeature(context, "languages"))) return;
    void Promise.allSettled([
      context.queryClient.query({ ...getLanguagesQueryOptions({ trpc: context.trpc }), staleTime: "static" }),
      context.queryClient.query({ ...getLanguageCatalogQueryOptions({ trpc: context.trpc }), staleTime: "static" }),
    ]);
  },
});
