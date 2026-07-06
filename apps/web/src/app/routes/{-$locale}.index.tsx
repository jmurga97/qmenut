import { createFileRoute } from "@tanstack/react-router";

import { getPublicMenuQueryOptions } from "~/features/menu/api/public-menu-query-options";
import { MenuPage } from "~/features/menu/pages/menu-page";
import { ISR_CACHE_CONTROL } from "~/lib/isr";
import { PublicPageSkeleton } from "~/shared/components/public-page-skeleton";

export const Route = createFileRoute("/{-$locale}/")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getPublicMenuQueryOptions({ host: context.tenant.host, locale: params.locale, trpc: context.trpc }),
    );
  },
  headers: () => ({
    "Cache-Control": ISR_CACHE_CONTROL,
  }),
  pendingComponent: PublicPageSkeleton,
  component: MenuPage,
});
