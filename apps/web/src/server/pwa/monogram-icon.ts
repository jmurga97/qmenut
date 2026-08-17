import { createServerTrpcCaller } from "~/lib/trpc-client";
import { resolveSsrTenantHost } from "~/server/tenant-host";
import { readTenantTheme } from "~/server/tenant-theme";

const CONNECTORS = new Set(["de", "del", "la", "el", "los", "las", "y", "the", "of", "and", "&"]);
const CANVAS = 512;
const CENTER = CANVAS / 2;
const CORNER_RADIUS = 96;
const FONT_SIZE = 256;
const MASKABLE_FONT_SIZE = 200;
const FONT_STACK = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";
const DARK_INK = "#141414";
const LIGHT_INK = "#FFFFFF";
const LIGHT_BACKGROUND_LUMINANCE = 0.45;

function branchInitials(name: string): string {
  const words = name
    .normalize("NFC")
    .split(/[\s_/-]+/u)
    .filter((word) => word.length > 0 && !CONNECTORS.has(word.toLowerCase()));

  if (words.length === 0) {
    return "Q";
  }

  return words
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toLocaleUpperCase("es-ES");
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function linearize(channel: number): number {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function readableInk(background: string): string {
  const value = background.trim().replace(/^#/, "");
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((channel) => channel + channel)
          .join("")
      : value;

  if (!/^[\da-f]{6}$/i.test(expanded)) {
    return LIGHT_INK;
  }

  const [red, green, blue] = [0, 2, 4].map((offset) =>
    linearize(Number.parseInt(expanded.slice(offset, offset + 2), 16) / 255),
  );
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return luminance > LIGHT_BACKGROUND_LUMINANCE ? DARK_INK : LIGHT_INK;
}

interface BuildMonogramSvgInput {
  background: string;
  initials: string;
  maskable: boolean;
}

function buildMonogramSvg({ background, initials, maskable }: BuildMonogramSvgInput): string {
  const fontSize = maskable ? MASKABLE_FONT_SIZE : FONT_SIZE;
  const radius = maskable ? 0 : CORNER_RADIUS;
  const ink = readableInk(background);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" width="${CANVAS}" height="${CANVAS}" role="img" aria-label="${escapeXml(initials)}">
  <rect width="${CANVAS}" height="${CANVAS}" rx="${radius}" fill="${escapeXml(background)}" />
  <text x="${CENTER}" y="${CENTER}" fill="${ink}" font-family="${FONT_STACK}" font-size="${fontSize}" font-weight="700" letter-spacing="-8" text-anchor="middle" dominant-baseline="central">${escapeXml(initials)}</text>
</svg>
`;
}

export async function serveMonogramIcon(maskable: boolean): Promise<Response> {
  const host = resolveSsrTenantHost();

  if (!host) {
    return new Response("Not found", { status: 404 });
  }

  const trpc = createServerTrpcCaller();
  const [data, theme] = await Promise.all([trpc.menu.publicData.query({ host }), readTenantTheme(host)]);

  if (!data) {
    return new Response("Not found", { status: 404 });
  }

  const svg = buildMonogramSvg({
    background: theme.primary,
    initials: branchInitials(data.branch.name),
    maskable,
  });

  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
}
