import { useState } from 'react';

const METRICS = [
  { key: 'est_1rm', label: 'Est 1RM', unit: 'lbs' },
  { key: 'volume', label: 'Volume', unit: 'lbs' },
  { key: 'top_weight', label: 'Top Set', unit: 'lbs' },
  { key: 'total_reps', label: 'Reps', unit: '' },
];

function fmt(n) {
  return n.toLocaleString('en-US');
}

function shortDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// viewBox geometry
const W = 600;
const H = 200;
const PAD = { top: 24, right: 16, bottom: 26, left: 16 };

export default function HistoryChart({ series }) {
  const [metricKey, setMetricKey] = useState('est_1rm');
  const metric = METRICS.find((m) => m.key === metricKey);

  if (!series || series.length === 0) return null;

  const values = series.map((d) => d[metricKey]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1; // avoid divide-by-zero on flat lines

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const x = (i) =>
    series.length === 1
      ? PAD.left + innerW / 2
      : PAD.left + (i / (series.length - 1)) * innerW;
  const y = (v) => PAD.top + innerH - ((v - min) / span) * innerH;

  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const last = values[values.length - 1];

  return (
    <div className="bg-bg-card-alt border border-border rounded-xl p-4 mb-5">
      {/* Metric toggle */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setMetricKey(m.key)}
            className={`text-sm px-3 py-1.5 rounded-lg border min-h-[36px] ${
              m.key === metricKey
                ? 'bg-accent border-accent text-white'
                : 'bg-transparent border-border-light text-text-secondary'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Current value */}
      <div className="font-mono text-2xl font-bold text-text-primary mb-1">
        {fmt(last)}
        {metric.unit && <span className="text-text-muted text-base font-normal"> {metric.unit}</span>}
      </div>

      {series.length < 2 ? (
        <p className="text-text-muted text-sm">Need at least two sessions to chart a trend.</p>
      ) : (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-accent-bright" style={{ height: 180 }}>
          {/* baseline */}
          <line
            x1={PAD.left} y1={PAD.top + innerH} x2={W - PAD.right} y2={PAD.top + innerH}
            stroke="var(--color-border)" strokeWidth="1"
          />
          {/* line */}
          <polyline
            points={points}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* dots */}
          {values.map((v, i) => (
            <circle
              key={i}
              cx={x(i)} cy={y(v)}
              r={i === values.length - 1 ? 5 : 3}
              fill="currentColor"
            />
          ))}
          {/* y bounds */}
          <text x={PAD.left} y={PAD.top - 8} fill="var(--color-text-muted)" fontSize="13" fontFamily="monospace">{fmt(max)}</text>
          <text x={PAD.left} y={H - 8} fill="var(--color-text-muted)" fontSize="13" fontFamily="monospace">{fmt(min)}</text>
          {/* date range */}
          <text x={W - PAD.right} y={H - 8} fill="var(--color-text-muted)" fontSize="13" fontFamily="monospace" textAnchor="end">
            {shortDate(series[0].date)} – {shortDate(series[series.length - 1].date)}
          </text>
        </svg>
      )}
    </div>
  );
}
