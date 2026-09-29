import { Badge, Switch } from "@jmurga97/components";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { useCan } from "~/shared/hooks/use-can";

import { getPromotionMutationOptions } from "../api";

import type { PromotionStatus } from "../types";

/** Quick on/off for a promotion; expired ones can only be revived from the editor, so they show a badge. */
export function PromotionStatusControl({
  branchId,
  promotion,
}: {
  branchId: string;
  promotion: { id: string; name: string; status: PromotionStatus };
}) {
  const canWrite = useCan("promotions.write");
  const queryClient = useQueryClient();
  const setStatus = useMutation(getPromotionMutationOptions({ branchId, queryClient, trpc }).setStatus);
  if (promotion.status === "expired") return <Badge tone={"neutral"}>{i18n.t("promotions___Expirada")}</Badge>;
  return (
    <Switch
      aria-label={i18n.t("promotions___Activar {{name}}", { name: promotion.name })}
      checked={promotion.status === "active"}
      disabled={!canWrite || setStatus.isPending}
      onCheckedChange={(checked) =>
        setStatus.mutate({ promotionId: promotion.id, status: checked ? "active" : "inactive" })
      }
    />
  );
}
