import { Badge, StatusText } from "@jmurga97/components";
import { useQueries, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";

import { resolveSelectedBranch, useBranchStore } from "~/app/store/branch-store";
import * as api from "~/features/dashboard/api";
import {
  getBranchAttentionItems,
  getMenuAttentionItems,
  getSubscriptionAttentionItems,
  getTranslationCoverageItems,
  sortAttentionItems,
} from "~/features/dashboard/services";
import { trpc } from "~/lib/trpc";
import { getTenantQueryOptions } from "~/shared/api";
import { useCan } from "~/shared/hooks/use-can";

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
  const [categoriesQuery, dishesQuery, languagesQuery, catalogQuery, billingQuery] = useQueries({
    queries: [
      { ...api.getMenuCategoriesQueryOptions({ branchId: branchId ?? "", trpc }), enabled: branchId !== null },
      { ...api.getMenuDishesQueryOptions({ branchId: branchId ?? "", trpc }), enabled: branchId !== null },
      api.getLanguagesQueryOptions({ trpc }),
      api.getLanguageCatalogQueryOptions({ trpc }),
      { ...api.getBillingOverviewQueryOptions({ trpc }), enabled: canBilling },
    ],
  });
  const languages = languagesQuery.data;
  const labelByCode = useMemo(
    () => new Map((catalogQuery.data ?? []).map((entry) => [entry.code, entry.label])),
    [catalogQuery.data],
  );
  const translationTargets = useMemo(() => {
    if (!languages) return [];
    return languages.languages.filter(
      (language) => language.isActive && language.languageCode !== languages.defaultLanguageCode,
    );
  }, [languages]);
  const translations = useQueries({
    queries: translationTargets.map((language) => ({
      ...api.getTranslationsQueryOptions({ branchId: branchId ?? "", languageCode: language.languageCode, trpc }),
      enabled: branchId !== null,
    })),
    combine: (results) => ({
      isPending: results.some((result) => result.isPending),
      coverages: results
        .map((result, index) => {
          const target = translationTargets[index];
          if (!target || !result.data || branchId === null) return null;
          return {
            languageCode: target.languageCode,
            label: labelByCode.get(target.languageCode) ?? target.languageCode.toUpperCase(),
            ...result.data.stats,
          };
        })
        .filter((coverage) => coverage !== null),
    }),
  });
  const items = useMemo(() => {
    const list: ReturnType<typeof getBranchAttentionItems> = [...getBranchAttentionItems(tenant.branches)];
    if (billingQuery.data) list.push(...getSubscriptionAttentionItems(billingQuery.data));
    if (categoriesQuery.data && dishesQuery.data) {
      list.push(...getMenuAttentionItems(categoriesQuery.data, dishesQuery.data));
    }
    list.push(...getTranslationCoverageItems(translations.coverages));
    return sortAttentionItems(list);
  }, [tenant.branches, billingQuery.data, categoriesQuery.data, dishesQuery.data, translations.coverages]);
  const isPending =
    categoriesQuery.isPending || dishesQuery.isPending || languagesQuery.isPending || translations.isPending;
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
