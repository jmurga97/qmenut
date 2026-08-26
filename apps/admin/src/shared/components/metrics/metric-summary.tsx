export interface MetricSummaryProps {
  description?: string;
  focusLabel: string;
  focusValue: string;
  label: string;
  supporting: Array<{ hint?: string; label: string; value: string }>;
}

/** Operational summary: one focal metric with divided supporting values — never equal cards. */
export function MetricSummary({ description, focusLabel, focusValue, label, supporting }: MetricSummaryProps) {
  return (
    <section aria-label={label} className="admin-metric-summary">
      <article className="admin-metric admin-metric--primary">
        <span className="admin-metric-label">{focusLabel}</span>
        <strong className="admin-metric-value">{focusValue}</strong>
        {description ? <span className="admin-metric-hint">{description}</span> : null}
      </article>
      <div className="admin-metric-supporting">
        {supporting.map((item) => (
          <article className="admin-metric" key={item.label}>
            <span className="admin-metric-label">{item.label}</span>
            <strong className="admin-metric-value">{item.value}</strong>
            {item.hint ? <span className="admin-metric-hint">{item.hint}</span> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
