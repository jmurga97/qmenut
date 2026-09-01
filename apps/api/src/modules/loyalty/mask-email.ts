/** Masks the local part of an email so consent recovery can hint at it without exposing it. */
export function maskEmail(email: string): string {
  const separatorIndex = email.indexOf("@");

  if (separatorIndex <= 0) {
    return "***";
  }

  return `${email.slice(0, 1)}***${email.slice(separatorIndex)}`;
}
