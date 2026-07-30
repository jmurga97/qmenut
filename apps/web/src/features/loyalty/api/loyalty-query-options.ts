import type { TrpcOptionsProxy } from "~/lib/trpc-client";

interface LoyaltyProgramQueryOptionsInput {
  host: string;
  trpc: TrpcOptionsProxy;
}

export function getLoyaltyProgramQueryOptions({ host, trpc }: LoyaltyProgramQueryOptionsInput) {
  return trpc.loyalty.program.queryOptions({ host });
}
