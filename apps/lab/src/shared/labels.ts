import type { LabOutputs } from "~/lib/trpc";

type Tone = "neutral" | "info" | "success" | "warning" | "error";
type Batch = LabOutputs["batches"]["get"]["batch"];
type Referral = LabOutputs["referrals"]["get"]["referral"];

// One mapping for the whole app: the same state always reads the same way.
export const BATCH_STATUS: Record<Batch["status"], { label: string; tone: Tone }> = {
  draft: { label: "Borrador", tone: "neutral" },
  preparing: { label: "Preparando", tone: "info" },
  sending: { label: "Enviando", tone: "info" },
  paused: { label: "En pausa", tone: "warning" },
  completed: { label: "Completado", tone: "success" },
};

export const REFERRAL_STATUS: Record<Referral["status"], { label: string; tone: Tone }> = {
  received: { label: "Recibido", tone: "neutral" },
  in_progress: { label: "En proceso", tone: "info" },
  approved: { label: "Aprobado", tone: "success" },
  rejected: { label: "Rechazado", tone: "error" },
};

export const PAYOUT_STATUS: Record<Referral["payoutStatus"], { label: string; tone: Tone }> = {
  unpaid: { label: "Sin pagar", tone: "warning" },
  paid: { label: "Pagado", tone: "success" },
};
