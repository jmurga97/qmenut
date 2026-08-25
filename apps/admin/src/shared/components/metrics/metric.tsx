import { cn } from "@ming/components";

export interface MetricProps {
  className?: string;
  emphasis?: boolean;
  hint?: string;
  label: string;
  value: string;
}

export function Metric({ className, emphasis = false, hint, label, value }: MetricProps) {
  return (
    <article className={cn("admin-metric", emphasis && "admin-metric--primary", className)}>
      <span className="admin-metric-label">{label}</span>
      <strong className="admin-metric-value">{value}</strong>
      {hint ? <span className="admin-metric-hint">{hint}</span> : null}
    </article>
  );
}
