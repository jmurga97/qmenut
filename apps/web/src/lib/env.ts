export function getEnvString(key: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[key];

  if (typeof value !== "string") {
    return undefined;
  }

  return value.trim() || undefined;
}
