// The landing has no generated Worker types; this is the one runtime module it reads.
declare module "cloudflare:workers" {
  export const env: Record<string, unknown>;
}
