// Home-screen labels are clipped hard by both iOS and Android; 12 characters is the safe budget.
export const SHORT_NAME_MAX_LENGTH = 12;

/** Truncates on a word boundary when possible, so home-screen labels never read as typos. */
export function truncateLabel(value: string, maxLength: number): string {
  const trimmed = value.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const clipped = trimmed.slice(0, maxLength);
  const lastSpace = clipped.lastIndexOf(" ");

  // A short whole word ("Aurum") reads better on a home screen than a clipped one
  // ("Aurum Passei"). Only a first word longer than the budget falls back to a hard cut.
  return (lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped).trimEnd();
}
