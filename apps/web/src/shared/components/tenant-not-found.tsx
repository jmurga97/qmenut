export function TenantNotFound() {
  return (
    <div className="home-shell">
      <div className="home-column status-column">
        <section className="public-status" aria-labelledby="tenant-not-found-title">
          <span className="public-status__mark" aria-hidden="true">
            !
          </span>
          <h1 id="tenant-not-found-title">Carta no disponible</h1>
          <p>
            No hay ningún restaurante configurado para este dominio. Revisa la dirección o contacta con el
            establecimiento.
          </p>
        </section>
      </div>
    </div>
  );
}
