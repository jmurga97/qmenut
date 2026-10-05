import { i18n } from "~/lib/i18n";

export const DAYS = [
  i18n.t("branch___Lunes"),
  i18n.t("branch___Martes"),
  i18n.t("branch___Miércoles"),
  i18n.t("branch___Jueves"),
  i18n.t("branch___Viernes"),
  i18n.t("branch___Sábado"),
  i18n.t("branch___Domingo"),
];
export function minutesToHHMM(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}
export function hhmmToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}
