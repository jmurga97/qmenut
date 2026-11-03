import { z } from "zod";

import { base64UrlDecode } from "../../lib/base64url";

import type { RuntimeEnv } from "../../config/env/schema";

const ACCESS_HEADER = "cf-access-jwt-assertion";

const headerSchema = z.object({ alg: z.literal("RS256"), kid: z.string().min(1) });
const audienceSchema = z.union([z.string(), z.array(z.string())]);
const claimsSchema = z.object({
  aud: audienceSchema,
  email: z.email(),
  exp: z.number(),
  iss: z.string(),
});
const jwkSchema = z.object({ kid: z.string(), kty: z.string() }).loose();
const certsSchema = z.object({ keys: z.array(jwkSchema) });

function decodeJson(part: string): unknown {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(part)));
}

/**
 * Verifies the Access JWT the edge adds to every lab.qmenut.app request. The Lab Worker forwards
 * the request untouched through its service binding, so the same header reaches the API either
 * way, and a call straight to api.qmenut.app without it is rejected.
 */
async function verifyAccessJwt(env: RuntimeEnv, token: string): Promise<string | null> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_LAB_AUD) return null;

  const [headerPart, claimsPart, signaturePart, ...rest] = token.split(".");
  if (!headerPart || !claimsPart || !signaturePart || rest.length > 0) return null;

  try {
    const header = headerSchema.parse(decodeJson(headerPart));
    const claims = claimsSchema.parse(decodeJson(claimsPart));
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}`;
    const audiences = typeof claims.aud === "string" ? [claims.aud] : claims.aud;
    if (claims.iss !== issuer || !audiences.includes(env.ACCESS_LAB_AUD) || claims.exp * 1000 <= Date.now()) {
      return null;
    }

    // Edge-cached for five minutes; Access rotates keys with overlap.
    const response = await fetch(`${issuer}/cdn-cgi/access/certs`, { cf: { cacheEverything: true, cacheTtl: 300 } });
    const { keys } = certsSchema.parse(await response.json());
    const jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) return null;

    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, [
      "verify",
    ]);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      base64UrlDecode(signaturePart),
      new TextEncoder().encode(`${headerPart}.${claimsPart}`),
    );

    return valid ? claims.email.toLowerCase() : null;
  } catch (error) {
    console.log("JWT de Cloudflare Access inválido", { error: error instanceof Error ? error.name : "unknown" });
    return null;
  }
}

/** Staff email when the request carries a valid Access identity on the allowlist, else null. */
export async function resolveStaffEmail({
  env,
  request,
}: {
  env: RuntimeEnv;
  request: Request;
}): Promise<string | null> {
  const token = request.headers.get(ACCESS_HEADER);
  const devEmail = env.NODE_ENV === "production" ? null : (env.LAB_DEV_STAFF_EMAIL?.toLowerCase() ?? null);
  const email = token ? await verifyAccessJwt(env, token) : devEmail;

  return email && env.LAB_STAFF_EMAILS.includes(email) ? email : null;
}
