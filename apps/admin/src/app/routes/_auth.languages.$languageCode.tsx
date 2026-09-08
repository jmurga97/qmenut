import { createFileRoute } from "@tanstack/react-router";

import { getLanguageCatalogQueryOptions, getTranslationsQueryOptions } from "~/features/languages/api";
import { TranslationsPage } from "~/features/languages/pages/translations-page";
import { getSelectedBranch } from "~/shared/api";

export const Route = createFileRoute("/_auth/languages/$languageCode")({
  component: function TranslationsRoute() {
    return <TranslationsPage languageCode={Route.useParams().languageCode} />;
  },
  loader: async ({ context, params }) => {
    const branch = await getSelectedBranch(context);
    await context.queryClient.query({ ...getLanguageCatalogQueryOptions({ trpc: context.trpc }), staleTime: "static" });
    if (!branch) return;
    await context.queryClient.query({
      ...getTranslationsQueryOptions({ branchId: branch.id, languageCode: params.languageCode, trpc: context.trpc }),
      staleTime: "static",
    });
  },
});
