export function TenantNotFound() {
  return (
    <div className="home-shell">
      <div className="home-column" style={{ padding: "48px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "8px" }}>Carta no disponible</h1>
        <p style={{ opacity: 0.7 }}>
          No hay ningún restaurante configurado para este dominio. Revisa la dirección o contacta con el
          establecimiento.
        </p>
      </div>
    </div>
  );
}
