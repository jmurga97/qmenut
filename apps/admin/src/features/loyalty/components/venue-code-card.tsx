import { Button } from "@jmurga97/components";
import { useId } from "react";

import { useVenueCode } from "~/features/loyalty/hooks/use-venue-code";
import { formatCountdown } from "~/features/loyalty/services";
import { i18n } from "~/lib/i18n";
import { Skeleton } from "~/shared/components/state/loading-state";

interface VenueCodeCardProps {
  branchId: string;
  className?: string;
  compact?: boolean;
  description?: string;
  heading: string;
}

export function VenueCodeCard({ branchId, className, compact = false, description, heading }: VenueCodeCardProps) {
  const titleId = useId();
  const { remainingMs, venueCodeQuery } = useVenueCode(branchId);
  const classes = ["loyalty-code-panel", compact ? "loyalty-code-panel--compact" : null, className]
    .filter(Boolean)
    .join(" ");
  return (
    <section aria-labelledby={titleId} className={classes}>
      <div className={"loyalty-code-copy"}>
        <h2 id={titleId}>{heading}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {venueCodeQuery.isPending ? (
        <div aria-busy={"true"} aria-label={i18n.t("loyalty___Cargando código")} className={"loyalty-code-placeholder"}>
          <Skeleton height={"2rem"} width={"8rem"} />
        </div>
      ) : null}
      {venueCodeQuery.isError ? (
        <Button onClick={() => void venueCodeQuery.refetch()} variant={"secondary"}>
          {i18n.t("loyalty___Reintentar código")}
        </Button>
      ) : null}
      {venueCodeQuery.data ? (
        <div className={"loyalty-code-live"}>
          <strong aria-atomic={"true"} aria-live={"polite"} className={"loyalty-code-digits"}>
            <span className="admin-visually-hidden">{i18n.t("loyalty___Código actual:")} </span>
            {venueCodeQuery.data.code}
          </strong>
          <div aria-hidden={"true"} className={"loyalty-countdown"}>
            <span>{formatCountdown(remainingMs)}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
