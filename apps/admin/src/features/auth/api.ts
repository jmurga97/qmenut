import { assertAuthClientResult, authClient } from "~/lib/auth-client";

export async function requestLoginOtp(email: string) {
  assertAuthClientResult(await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }));
}
export async function signInWithOtp(email: string, otp: string) {
  assertAuthClientResult(await authClient.signIn.emailOtp({ email, otp }));
}
