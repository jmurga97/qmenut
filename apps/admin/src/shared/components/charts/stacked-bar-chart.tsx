import "./styles.css";

export interface StackedBarSeries {
  key: string;
  label: string;
  tone: "ink" | "service";
}

export interface StackedBarPoint {
  id: string;
  label: string;
  values: Record<string, number>;
}

interface StackedBarChartProps {
  ariaLabel: string;
  emptyLabel: string;
  points: StackedBarPoint[];
  series: ReadonlyArray<StackedBarSeries>;
}

const BAR_WIDTH = 10;
const GAP = 4;
const PLOT_HEIGHT = 128;

function getNiceCeil(value: number): number {
  if (value <= 4) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  return getNiceScaled(scaled) * magnitude;
}

function getNiceScaled(scaled: number): number {
  if (scaled <= 2) return 2;
  if (scaled <= 5) return 5;
  return 10;
}

function getAxisLabels(points: StackedBarPoint[]): string[] {
  if (points.length < 3) return points.map((point) => point.label);
  const middle = points.at(Math.floor(points.length / 2));
  return [points[0]?.label ?? "", middle?.label ?? "", points.at(-1)?.label ?? ""];
}

export function StackedBarChart({ ariaLabel, emptyLabel, points, series }: StackedBarChartProps) {
  const totalsBySeries = new Map(series.map((entry) => [entry.key, 0]));
  let maxTotal = 0;
  for (const point of points) {
    let total = 0;
    for (const entry of series) {
      const value = point.values[entry.key] ?? 0;
      total += value;
      totalsBySeries.set(entry.key, (totalsBySeries.get(entry.key) ?? 0) + value);
    }
    maxTotal = Math.max(maxTotal, total);
  }

  if (points.length === 0 || maxTotal === 0) {
    return <p className="stacked-bar__empty">{emptyLabel}</p>;
  }

  const yMax = getNiceCeil(maxTotal);
  const step = BAR_WIDTH + GAP;
  const plotWidth = points.length * step;
  const axisLabels = getAxisLabels(points);

  return (
    <figure className="stacked-bar">
      <div className="stacked-bar__plot">
        <svg
          aria-label={ariaLabel}
          className="stacked-bar__svg"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          style={{ maxWidth: `${plotWidth}px` }}
          viewBox={`0 0 ${plotWidth} ${PLOT_HEIGHT}`}
        >
          {points.map((point, pointIndex) => {
            let cursor = PLOT_HEIGHT;
            const tooltip = `${point.label} — ${series
              .map((entry) => `${point.values[entry.key] ?? 0} ${entry.label}`)
              .join(" · ")}`;
            return (
              <g key={point.id}>
                <title>{tooltip}</title>
                {series.map((entry) => {
                  const value = point.values[entry.key] ?? 0;
                  if (value === 0) return null;
                  const height = Math.max(1, Math.round((value / yMax) * PLOT_HEIGHT));
                  cursor -= height;
                  return (
                    <rect
                      className={`stacked-bar__segment stacked-bar__segment--${entry.tone}`}
                      height={height}
                      key={entry.key}
                      rx={1.5}
                      width={BAR_WIDTH}
                      x={pointIndex * step + GAP / 2}
                      y={cursor}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      {axisLabels.length > 1 ? (
        <div aria-hidden="true" className="stacked-bar__axis">
          {axisLabels.map((label, index) => (
            <span key={`${index}-${label}`}>{label}</span>
          ))}
        </div>
      ) : null}
      <figcaption>
        <ul className="stacked-bar__legend">
          {series.map((entry) => (
            <li className="stacked-bar__legend-item" key={entry.key}>
              <span aria-hidden="true" className={`stacked-bar__swatch stacked-bar__segment--${entry.tone}`} />
              <span className="stacked-bar__legend-value">{totalsBySeries.get(entry.key) ?? 0}</span>
              {entry.label}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
