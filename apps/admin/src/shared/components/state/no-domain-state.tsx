import { EmptyState } from "./empty-state";

export function NoDomainState({ description }: { description: string }) {
  return (
    <div className="admin-page">
      <EmptyState description={description} title="Sin dominio" />
    </div>
  );
}
