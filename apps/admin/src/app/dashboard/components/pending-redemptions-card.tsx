import { PendingRedemptionsPanel } from "~/features/loyalty/components/pending-redemptions-panel";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

export function PendingRedemptionsCard() {
  const branch = useSelectedBranch();
  if (!branch) return null;
  return <PendingRedemptionsPanel branchId={branch.id} key={branch.id} titleId="dashboard-redemptions-title" />;
}
