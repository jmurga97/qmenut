import { base64UrlDecode, base64UrlEncode } from "./base64url";

/** Web Push with WebCrypto only: VAPID (RFC 8292) and aes128gcm payload encryption (RFC 8291). */

export interface PushSubscriptionKeys {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface VapidKeys {
  publicKey: string;
  privateKey: string;
  subject: string;
}

interface SendWebPushInput {
  subscription: PushSubscriptionKeys;
  payload: string;
  vapid: VapidKeys;
  /** Replaces an undelivered push with the same topic at the push service. Any string: it is hashed to fit RFC 8030. */
  topic?: string;
  ttlSeconds?: number;
}

export interface SendWebPushResult {
  status: number;
  retryAfterSeconds: number | null;
}

const RECORD_SIZE = 4096;
const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((length, part) => length + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

async function hkdf({
  salt,
  ikm,
  info,
  length,
}: {
  salt: Uint8Array<ArrayBuffer>;
  ikm: Uint8Array<ArrayBuffer>;
  info: Uint8Array<ArrayBuffer>;
  length: number;
}): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8);

  return new Uint8Array(bits);
}

export async function encryptPayload({
  payload,
  p256dh,
  auth,
}: {
  payload: string;
  p256dh: string;
  auth: string;
}): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = base64UrlDecode(p256dh);
  const authSecret = base64UrlDecode(auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKeys = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
    "deriveBits",
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array((await crypto.subtle.exportKey("raw", asKeys.publicKey)) as ArrayBuffer);
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      // workerd reads `public`; its TypeScript types spell it `$public`.
      { name: "ECDH", public: uaKey } as unknown as SubtleCryptoDeriveKeyAlgorithm,
      asKeys.privateKey,
      256,
    ),
  );

  const ikm = await hkdf({
    salt: authSecret,
    ikm: ecdhSecret,
    info: concat(encoder.encode("WebPush: info\0"), uaPublic, asPublic),
    length: 32,
  });
  const cek = await hkdf({ salt, ikm, info: concat(encoder.encode("Content-Encoding: aes128gcm\0")), length: 16 });
  const nonce = await hkdf({ salt, ikm, info: concat(encoder.encode("Content-Encoding: nonce\0")), length: 12 });

  const aesKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // Single record: the payload, then the 0x02 last-record delimiter.
  const record = concat(encoder.encode(payload), new Uint8Array([2]));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, record));
  const header = new Uint8Array(21);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header.set(salt, 0);
  header[20] = asPublic.length;

  return concat(header, asPublic, ciphertext);
}

async function vapidAuthorization({ endpoint, vapid }: { endpoint: string; vapid: VapidKeys }): Promise<string> {
  const publicKey = base64UrlDecode(vapid.publicKey);
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      x: base64UrlEncode(publicKey.slice(1, 33)),
      y: base64UrlEncode(publicKey.slice(33, 65)),
      d: vapid.privateKey,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const encodeJson = (value: object) => base64UrlEncode(encoder.encode(JSON.stringify(value)));
  const header = encodeJson({ typ: "JWT", alg: "ES256" });
  const claims = encodeJson({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: vapid.subject,
  });
  // WebCrypto ECDSA signatures are already raw r‖s, the JWS ES256 format.
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(`${header}.${claims}`),
  );

  return `vapid t=${header}.${claims}.${base64UrlEncode(new Uint8Array(signature))}, k=${vapid.publicKey}`;
}

export async function sendWebPush({
  subscription,
  payload,
  vapid,
  topic,
  ttlSeconds = 12 * 60 * 60,
}: SendWebPushInput): Promise<SendWebPushResult> {
  const body = await encryptPayload({ payload, p256dh: subscription.p256dh, auth: subscription.auth });
  const headers: Record<string, string> = {
    Authorization: await vapidAuthorization({ endpoint: subscription.endpoint, vapid }),
    "Content-Encoding": "aes128gcm",
    "Content-Type": "application/octet-stream",
    TTL: String(ttlSeconds),
    Urgency: "high",
  };

  // RFC 8030 caps Topic at 32 base64url characters.
  if (topic) {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(topic));
    headers.Topic = base64UrlEncode(new Uint8Array(digest)).slice(0, 32);
  }

  const response = await fetch(subscription.endpoint, { method: "POST", headers, body });
  const retryAfter = Number(response.headers.get("Retry-After"));

  return {
    status: response.status,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
  };
}
