import { Link } from "@tanstack/react-router";

import { i18n } from "~/lib/i18n";

export function NotFoundState(): React.JSX.Element {
  return (
    <div className={"admin-state-shell admin-state-not-found"}>
      <div className="admin-state-eyebrow">404</div>
      <h1>{i18n.t("shared___Esta página no existe.")}</h1>
      <p>{i18n.t("shared___Comprueba la dirección o vuelve al panel principal.")}</p>
      <Link className="admin-link" to="/">
        {i18n.t("shared___Volver al resumen")}
      </Link>
    </div>
  );
}
