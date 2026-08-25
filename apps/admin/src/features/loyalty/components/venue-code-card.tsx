import { Button } from "@ming/components";
import { useId } from "react";

import { useVenueCode } from "~/features/loyalty/hooks/use-venue-code";
import { formatCountdown } from "~/features/loyalty/services";

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
      <div className="loyalty-code-copy">
        <h3 id={titleId}>{heading}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {venueCodeQuery.isPending ? <div className="loyalty-code-placeholder">····</div> : null}
      {venueCodeQuery.isError ? (
        <Button onClick={() => void venueCodeQuery.refetch()} variant="secondary">
          Reintentar código
        </Button>
      ) : null}
      {venueCodeQuery.data ? (
        <div className="loyalty-code-live">
          <strong aria-atomic="true" aria-live="polite" className="loyalty-code-digits">
            <span className="admin-visually-hidden">Código actual: </span>
            {venueCodeQuery.data.code}
          </strong>
          <div aria-hidden="true" className="loyalty-countdown">
            <span>{formatCountdown(remainingMs)}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
