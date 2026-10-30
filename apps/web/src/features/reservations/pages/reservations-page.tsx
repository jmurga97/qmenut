import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import "~/features/reservations/styles.css";
import { ReservationExperience } from "~/features/reservations/components/reservation-experience";
import { useTrackPageView } from "~/lib/analytics/use-analytics";

export function ReservationsPage() {
  const { t } = useTranslation();

  useTrackPageView("reservations_view");

  return (
    <div className="reservations-page">
      <Suspense fallback={<div className="reservations-loading" aria-label={t("reservations.loading")} />}>
        <ReservationExperience />
      </Suspense>
    </div>
  );
}
