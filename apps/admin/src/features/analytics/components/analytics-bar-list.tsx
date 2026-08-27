import { formatNumber } from "~/shared/services/format";

export interface AnalyticsBarListItem {
  id: string;
  label: string;
  meta?: string;
  value: number;
  valueLabel?: string;
}

export function AnalyticsBarList({
  emptyLabel = "Sin datos en este periodo.",
  items,
}: {
  emptyLabel?: string;
  items: AnalyticsBarListItem[];
}) {
  if (items.length === 0) return <p className="analytics-empty-detail">{emptyLabel}</p>;

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ol className="analytics-bar-list">
      {items.map((item, index) => (
        <li className="analytics-bar-list__item" key={item.id}>
          <div className="analytics-bar-list__heading">
            <span className="analytics-bar-list__rank">{index + 1}</span>
            <span className="analytics-bar-list__label">{item.label}</span>
            <strong>{item.valueLabel ?? formatNumber(item.value)}</strong>
          </div>
          <div aria-hidden="true" className="analytics-bar-list__track">
            <span style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          {item.meta ? <span className="analytics-bar-list__meta">{item.meta}</span> : null}
        </li>
      ))}
    </ol>
  );
}
