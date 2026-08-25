import { PendingRedemptionsPanel } from "~/features/loyalty/components/pending-redemptions-panel";
import { VenueCodeCard } from "~/features/loyalty/components/venue-code-card";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export function LoyaltyOperationsPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para mostrar el código de fidelización." />;
  return <LoyaltyOperationsContent branchId={branch.id} branchName={branch.name} key={branch.id} />;
}
function LoyaltyOperationsContent({ branchId, branchName }: { branchId: string; branchName: string }) {
  return (
    <div className="admin-page admin-loyalty-page">
      <PageHeader kicker={`Operativa · ${branchName}`} title="Fidelización" />
      <VenueCodeCard
        branchId={branchId}
        description="Cambia automáticamente. No hace falta tocar nada."
        heading="Código de esta sucursal"
      />
      <PendingRedemptionsPanel branchId={branchId} titleId="loyalty-redemptions-title" />
    </div>
  );
}
