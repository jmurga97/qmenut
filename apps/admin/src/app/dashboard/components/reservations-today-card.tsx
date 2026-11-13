import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { getReservationDayQueryOptions } from "~/app/dashboard/api";
import { i18n } from "~/lib/i18n";
import { trpc } from "~/lib/trpc";

export function ReservationsTodayCard({ branchId }: { branchId: string }) {
  const { data, isPending, isError } = useQuery(getReservationDayQueryOptions({ branchId, trpc }));
  const count = data?.reservations.filter(
    (reservation) => reservation.status === "pending" || reservation.status === "confirmed",
  ).length;
  let content: string | number | undefined = count;
  if (isPending) content = i18n.t("dashboard___Cargando reservas…");
  if (isError) content = i18n.t("dashboard___No se pudieron cargar las reservas.");
  return (
    <section className="admin-card" aria-labelledby="dashboard-reservations-title">
      <div className="admin-toolbar">
        <h2 id="dashboard-reservations-title">{i18n.t("dashboard___Reservas de hoy")}</h2>
        <Link className="admin-link" to="/reservations" search={{ date: "" }}>
          {i18n.t("dashboard___Ver reservas →")}
        </Link>
      </div>
      <p>{content}</p>
    </section>
  );
}
