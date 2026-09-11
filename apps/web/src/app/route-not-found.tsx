import { Link } from "@tanstack/react-router";

// Rendered whenever `notFound()` is thrown (unknown paths under `/{-$locale}`, missing
// assets requested through the router, ...). Without it TanStack falls back to a bare
// `<p>Not Found</p>` and logs a warning on every hit.
export function RouteNotFound() {
  return (
    <div className="home-shell">
      <div className="home-column status-column">
        <section className="public-status" aria-labelledby="route-not-found-title">
          <span className="public-status__mark" aria-hidden="true">
            ?
          </span>
          <h1 id="route-not-found-title">Página no encontrada</h1>
          <p>La dirección solicitada no existe o ya no está disponible.</p>
          <p>
            <Link to="/{-$locale}">Volver al inicio</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
