import { z } from "zod";

export const REDEMPTION_TTL_MS = 15 * 60 * 1000;

const loyaltyTokenPayloadSchema = z.object({
  v: z.literal(1),
  t: z.literal("card"),
  cid: z.string().min(1),
  rid: z.string().min(1),
});

export type LoyaltyTokenPayload = z.infer<typeof loyaltyTokenPayloadSchema>;

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCodePoint(byte);
  }

  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }

  return bytes;
}

export function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

interface SignLoyaltyTokenInput {
  secret: string;
  payload: LoyaltyTokenPayload;
}

export async function signLoyaltyToken({ secret, payload }: SignLoyaltyTokenInput): Promise<string> {
  const key = await importHmacKey(secret);
  const payloadB64 = base64UrlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));

  return `${payloadB64}.${base64UrlEncode(new Uint8Array(signature))}`;
}

interface VerifyLoyaltyTokenInput {
  secret: string;
  token: string;
}

export async function verifyLoyaltyToken({
  secret,
  token,
}: VerifyLoyaltyTokenInput): Promise<LoyaltyTokenPayload | null> {
  const [payloadB64, sigB64, ...rest] = token.split(".");

  if (!payloadB64 || !sigB64 || rest.length > 0) {
    return null;
  }

  let signatureBytes: Uint8Array<ArrayBuffer>;

  try {
    signatureBytes = base64UrlDecode(sigB64);
  } catch {
    return null;
  }

  const key = await importHmacKey(secret);
  const isValid = await crypto.subtle.verify("HMAC", key, signatureBytes, new TextEncoder().encode(payloadB64));

  if (!isValid) {
    return null;
  }

  try {
    const json = new TextDecoder().decode(base64UrlDecode(payloadB64));
    const parsed = loyaltyTokenPayloadSchema.safeParse(JSON.parse(json));

    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
