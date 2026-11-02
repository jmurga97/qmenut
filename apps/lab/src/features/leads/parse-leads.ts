import { z } from "zod";

export const MAX_LEADS = 50_000;

const emailSchema = z.email();

export interface ParsedLeads {
  valid: Array<{ email: string; name: string | null }>;
  invalid: string[];
  duplicates: number;
  tooMany: boolean;
}

// ponytail: one record per line (no line breaks inside quoted cells), enough for contact exports.
function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) {
      cells.push(cell);
      cell = "";
    } else cell += char;
  }
  cells.push(cell);

  return cells;
}

/** Comma or semicolon separated, quoted cells with "" escapes. */
function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  const delimiter = (lines[0] ?? "").includes(";") ? ";" : ",";

  return lines.map((line) => splitLine(line, delimiter));
}

const asText = (value: unknown): string => (typeof value === "string" ? value : "");

function fromJson(text: string): Array<[string, string]> {
  const data: unknown = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error("El JSON debe ser un arreglo de contactos.");

  return data.map((item: unknown) => {
    if (typeof item === "string") return [item, ""];
    const record = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    return [asText(record.email), asText(record.name) || asText(record.nombre)];
  });
}

function fromCsv(text: string): Array<[string, string]> {
  const rows = parseCsv(text);
  const header = (rows[0] ?? []).map((cell) => cell.trim().toLowerCase());
  const emailColumn = header.findIndex((cell) => cell === "email" || cell === "correo");
  if (emailColumn === -1) return rows.map((cells) => [cells[0] ?? "", cells[1] ?? ""]);

  const nameColumn = header.findIndex((cell) => cell === "name" || cell === "nombre");
  return rows.slice(1).map((cells) => [cells[emailColumn] ?? "", nameColumn === -1 ? "" : (cells[nameColumn] ?? "")]);
}

/** CSV (header with email/correo and optional name/nombre, or email-first columns) or a JSON array. */
export function parseLeads(fileName: string, text: string): ParsedLeads {
  const entries = fileName.toLowerCase().endsWith(".json") ? fromJson(text) : fromCsv(text);
  const seen = new Set<string>();
  const result: ParsedLeads = { valid: [], invalid: [], duplicates: 0, tooMany: entries.length > MAX_LEADS };

  for (const [rawEmail, rawName] of entries) {
    const email = rawEmail.trim().toLowerCase();
    if (!emailSchema.safeParse(email).success) {
      result.invalid.push(rawEmail.trim() || "(vacío)");
    } else if (seen.has(email)) {
      result.duplicates += 1;
    } else {
      seen.add(email);
      result.valid.push({ email, name: rawName.trim().slice(0, 120) || null });
    }
  }

  return result;
}
