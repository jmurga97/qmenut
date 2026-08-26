import { assertAuthClientResult, authClient } from "~/lib/auth-client";

import type { TrpcOptionsProxy } from "~/lib/trpc";

export async function requestLoginOtp(email: string) {
  assertAuthClientResult(await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }));
}
export async function signInWithOtp(email: string, otp: string) {
  assertAuthClientResult(await authClient.signIn.emailOtp({ email, otp }));
}

export function getListRestaurantsQueryOptions({ trpc }: { trpc: TrpcOptionsProxy }) {
  return trpc.auth.listRestaurants.queryOptions();
}
