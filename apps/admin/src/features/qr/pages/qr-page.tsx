import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { QrPanel } from "../components/qr-panel";

export function QrPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para generar su código QR." />;
  if (!branch.customDomain)
    return <NoDomainState description="El QR necesita un dominio. Contacta con QMenut para asignarlo." />;
  return <QrPanel branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}
