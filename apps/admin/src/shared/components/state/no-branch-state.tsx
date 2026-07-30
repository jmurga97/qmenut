import { EmptyState } from "./empty-state";

export function NoBranchState({ description }: { description: string }) {
  return (
    <div className="admin-page">
      <EmptyState description={description} title="Sin sucursal" />
    </div>
  );
}
