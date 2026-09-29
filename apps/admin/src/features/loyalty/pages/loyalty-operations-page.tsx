import { PendingRedemptionsPanel } from "~/features/loyalty/components/pending-redemptions-panel";
import { VenueCodeCard } from "~/features/loyalty/components/venue-code-card";
import { i18n } from "~/lib/i18n";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export function LoyaltyOperationsPage() {
  const branch = useSelectedBranch();
  if (!branch)
    return (
      <NoBranchState description={i18n.t("loyalty___Crea una sucursal para mostrar el código de fidelización.")} />
    );
  return <LoyaltyOperationsContent branchId={branch.id} key={branch.id} />;
}
function LoyaltyOperationsContent({ branchId }: { branchId: string }) {
  return (
    <>
      <VenueCodeCard
        branchId={branchId}
        description={i18n.t("loyalty___Cambia automáticamente. No hace falta tocar nada.")}
        heading={i18n.t("loyalty___Código de esta sucursal")}
      />
      <PendingRedemptionsPanel branchId={branchId} titleId={"loyalty-redemptions-title"} />
    </>
  );
}
