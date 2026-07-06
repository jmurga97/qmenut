export function LoadingState({ label = "Cargando panel..." }: { label?: string }) {
  return (
    <div className="admin-state-shell">
      <div className="admin-state-eyebrow">Cargando</div>
      <h2>{label}</h2>
      <p>Preparando los datos de tu restaurante.</p>
    </div>
  );
}
