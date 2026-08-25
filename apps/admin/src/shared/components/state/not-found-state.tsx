import { Link } from "@tanstack/react-router";

export function NotFoundState(): React.JSX.Element {
  return (
    <div className="admin-state-shell admin-state-not-found">
      <div className="admin-state-eyebrow">404</div>
      <h2>Esta página no existe.</h2>
      <p>Comprueba la dirección o vuelve al panel principal.</p>
      <Link className="admin-link" to="/">
        Volver al resumen
      </Link>
    </div>
  );
}
