import { Badge, StatusText } from "@jmurga97/components";
import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import * as api from "~/app/dashboard/api";
import {
  getBranchAttentionItems,
  getMenuAttentionItems,
  getSubscriptionAttentionItems,
  sortAttentionItems,
} from "~/app/dashboard/services";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { useCan } from "~/shared/hooks/use-can";
import { resolveSelectedBranch, useBranchStore } from "~/shared/stores/branch-store";

const SEVERITY_BADGE_LABEL = { error: "Urgente", info: "Info", warning: "Aviso" } as const;

export function AttentionPanel() {
  const canSeePanel = useCan("branch.write");
  if (!canSeePanel) return null;
  return <AttentionContent />;
}

function AttentionContent() {
  const { data: tenant } = useSuspenseQuery(getTenantQueryOptions({ trpc }));
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const branch = resolveSelectedBranch(tenant.branches, selectedBranchId);
  const canBilling = useCan("billing.manage");
  const branchId = branch?.id ?? null;
  const [categoriesQuery, dishesQuery, billingQuery] = useQueries({
    queries: [
      { ...api.getMenuCategoriesQueryOptions({ branchId: branchId ?? "", trpc }), enabled: branchId !== null },
      { ...api.getMenuDishesQueryOptions({ branchId: branchId ?? "", trpc }), enabled: branchId !== null },
      { ...api.getBillingOverviewQueryOptions({ trpc }), enabled: canBilling },
    ],
  });
  const items = useMemo(() => {
    const list: ReturnType<typeof getBranchAttentionItems> = [...getBranchAttentionItems(tenant.branches)];
    if (billingQuery.data) list.push(...getSubscriptionAttentionItems(billingQuery.data));
    if (categoriesQuery.data && dishesQuery.data) {
      list.push(...getMenuAttentionItems(categoriesQuery.data, dishesQuery.data));
    }
    return sortAttentionItems(list);
  }, [tenant.branches, billingQuery.data, categoriesQuery.data, dishesQuery.data]);
  const isPending = categoriesQuery.isPending || dishesQuery.isPending;
  return (
    <section aria-labelledby="admin-attention-title" className="admin-card admin-attention">
      <div className="admin-toolbar">
        <h3 id="admin-attention-title">Atención</h3>
        {isPending ? <span className="admin-attention-pending">Revisando…</span> : null}
      </div>
      {items.length === 0 && !isPending ? (
        <StatusText tone="success">Todo al día. No hay avisos que revisar.</StatusText>
      ) : (
        <ul className="admin-attention-list">
          {items.map((item) => (
            <li className="admin-attention-item" key={item.id}>
              <Badge tone={item.severity}>{SEVERITY_BADGE_LABEL[item.severity]}</Badge>
              <div className="admin-attention-copy">
                {item.linkTo ? (
                  <Link params={item.linkParams} to={item.linkTo}>
                    {item.label}
                  </Link>
                ) : (
                  <strong>{item.label}</strong>
                )}
                {item.detail ? <small>{item.detail}</small> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
