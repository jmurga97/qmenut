import type { TrpcOptionsProxy } from "~/lib/trpc";

interface PrintableMenuQueryInput {
  host: string;
  locale?: string;
  trpc: TrpcOptionsProxy;
}

export function getPrintableMenuQueryOptions({ host, locale, trpc }: PrintableMenuQueryInput) {
  return trpc.menu.publicData.queryOptions({ host, locale });
}

export function getPrintableMenuThemeQueryOptions({ branchId, trpc }: { branchId: string; trpc: TrpcOptionsProxy }) {
  return trpc.admin.theme.get.queryOptions({ branchId });
}
