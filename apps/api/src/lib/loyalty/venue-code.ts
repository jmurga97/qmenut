import { importHmacKey } from "./token";

export const VENUE_CODE_WINDOW_MS = 3 * 60 * 1000;

const CODE_DIGITS = 4;
const CODE_MODULUS = 10 ** CODE_DIGITS;

interface ComputeCodeInput {
  secret: string;
  restaurantId: string;
  branchId: string;
  windowIndex: number;
}

async function computeCode({ secret, restaurantId, branchId, windowIndex }: ComputeCodeInput): Promise<string> {
  const key = await importHmacKey(secret);
  const data = new TextEncoder().encode(`${restaurantId}:${branchId}:${windowIndex}`);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
  const num = new DataView(signature.buffer).getUint32(signature.byteLength - 4) % CODE_MODULUS;

  return num.toString().padStart(CODE_DIGITS, "0");
}

interface GetVenueCodeInput {
  secret: string;
  restaurantId: string;
  branchId: string;
  now?: number;
}

export interface VenueCode {
  code: string;
  expiresAt: number;
}

export async function getVenueCode({
  secret,
  restaurantId,
  branchId,
  now = Date.now(),
}: GetVenueCodeInput): Promise<VenueCode> {
  const windowIndex = Math.floor(now / VENUE_CODE_WINDOW_MS);
  const code = await computeCode({ secret, restaurantId, branchId, windowIndex });

  return { code, expiresAt: (windowIndex + 1) * VENUE_CODE_WINDOW_MS };
}

interface BranchMatchesCodeInput {
  secret: string;
  restaurantId: string;
  branchId: string;
  code: string;
  currentWindow: number;
}

async function branchMatchesCode({
  secret,
  restaurantId,
  branchId,
  code,
  currentWindow,
}: BranchMatchesCodeInput): Promise<boolean> {
  for (const windowIndex of [currentWindow, currentWindow - 1]) {
    const candidate = await computeCode({ secret, restaurantId, branchId, windowIndex });

    if (candidate === code) {
      return true;
    }
  }

  return false;
}

interface VerifyVenueCodeInput {
  secret: string;
  restaurantId: string;
  branchIds: string[];
  code: string;
  now?: number;
}

/** Accepts the current and previous window (skew + slow readers). Returns the matching branch id. */
export async function verifyVenueCode({
  secret,
  restaurantId,
  branchIds,
  code,
  now = Date.now(),
}: VerifyVenueCodeInput): Promise<string | null> {
  const currentWindow = Math.floor(now / VENUE_CODE_WINDOW_MS);

  for (const branchId of branchIds) {
    if (await branchMatchesCode({ secret, restaurantId, branchId, code, currentWindow })) {
      return branchId;
    }
  }

  return null;
}
