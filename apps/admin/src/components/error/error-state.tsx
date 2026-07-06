import { getErrorMessage } from "@lib/errors";

export function RouteErrorState({ error }: { error: Error }) {
  return (
    <div className="admin-state-shell admin-state-error">
      <div className="admin-state-eyebrow">Error</div>
      <h2>No hemos podido cargar esta vista.</h2>
      <p>{getErrorMessage(error)}</p>
    </div>
  );
}
