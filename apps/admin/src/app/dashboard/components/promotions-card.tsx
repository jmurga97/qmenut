import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import * as api from "~/app/dashboard/api";
import { PromotionStatusControl } from "~/features/promotions/components/promotion-status-control";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";
import { EntityListCard } from "~/shared/components/entity-list-card";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export function PromotionsCard() {
  const branch = useSelectedBranch();
  if (!branch) return null;
  return <PromotionsList branchId={branch.id} key={branch.id} />;
}

function PromotionsList({ branchId }: { branchId: string }) {
  const promotions = useSuspenseQuery(api.getPromotionsQueryOptions({ branchId, trpc })).data.filter(
    (promotion) => promotion.status !== "expired",
  );
  return (
    <EntityListCard
      action={
        <Link className="admin-link" to={"/promotions"}>
          {i18n.t("dashboard___Gestionar promociones →")}
        </Link>
      }
      count={promotions.length}
      emptyText={i18n.t("dashboard___No hay promociones activas ni programadas.")}
      title={i18n.t("dashboard___Promociones")}
    >
      {promotions.map((promotion) => (
        <li className="admin-list-item" key={promotion.id}>
          <Link
            className={"admin-link admin-list-label"}
            params={{ promotionId: promotion.id }}
            to={"/promotions/$promotionId"}
          >
            {promotion.name}
          </Link>
          <PromotionStatusControl branchId={branchId} promotion={promotion} />
        </li>
      ))}
    </EntityListCard>
  );
}
