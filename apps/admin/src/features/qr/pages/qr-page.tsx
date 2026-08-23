import { FormProvider } from "react-hook-form";

import { PrintableMenuPanel } from "~/features/printable-menu/components/printable-menu-panel";
import { FormSelect } from "~/shared/components/forms/adapters/form-select";
import { FormShell } from "~/shared/components/forms/form-shell";
import { PageHeader } from "~/shared/components/page-header";
import { NoBranchState } from "~/shared/components/state/no-branch-state";
import { NoDomainState } from "~/shared/components/state/no-domain-state";
import { useSelectedBranch } from "~/shared/hooks/use-selected-branch";

import { useQrController } from "../hooks/use-qr-controller";
import { QR_PREVIEW_SIZE } from "../services";

const QR_SIZE_OPTIONS = [512, 1024, 2048].map((size) => ({ id: String(size), label: `${size} × ${size} px` }));
export function QrPage() {
  const branch = useSelectedBranch();
  if (!branch) return <NoBranchState description="Crea una sucursal para generar su código QR." />;
  if (!branch.customDomain)
    return <NoDomainState description="El QR necesita un dominio. Contacta con QMenut para asignarlo." />;
  return <QrPanel branchId={branch.id} host={branch.customDomain} key={branch.id} />;
}
function QrPanel({ branchId, host }: { branchId: string; host: string }) {
  const controller = useQrController(host);
  return (
    <div className="admin-page">
      <PageHeader kicker={`Código QR · ${host}`} title="Código QR de la carta" />
      <FormProvider {...controller.form}>
        <FormShell
          actions={
            <>
              <mc-button onClick={() => void controller.download("svg")} variant="secondary">
                Descargar SVG
              </mc-button>
              <mc-button onClick={() => void controller.copy()} variant="secondary">
                Copiar URL
              </mc-button>
            </>
          }
          error={controller.error}
          onSubmit={() => void controller.download("png")}
          submitLabel="Descargar PNG"
          success={controller.success}
        >
          <div className="admin-qr-preview">
            <canvas ref={controller.canvasRef} height={QR_PREVIEW_SIZE} width={QR_PREVIEW_SIZE} />
          </div>
          <div className="admin-form-grid">
            <FormSelect label="Tamaño del PNG" name="size" options={QR_SIZE_OPTIONS} />
          </div>
        </FormShell>
      </FormProvider>
      <PrintableMenuPanel branchId={branchId} host={host} />
    </div>
  );
}
