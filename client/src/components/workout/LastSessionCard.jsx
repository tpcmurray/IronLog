import { Link } from 'react-router-dom';
import { formatWeight } from '../../utils/formatters';

export default function LastSessionCard({ lastSession, exerciseId }) {
  if (!lastSession) {
    return (
      <div className="bg-bg-card-alt border border-border rounded-xl p-4 mb-5">
        <div className="text-accent-bright text-xs font-medium tracking-widest uppercase">
          First Time
        </div>
        <p className="text-text-muted text-sm mt-2">No prior session data.</p>
      </div>
    );
  }

  const dateLabel = new Date(lastSession.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="bg-bg-card-alt border border-border rounded-xl p-4 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-accent-bright text-xs font-medium tracking-widest uppercase">
          Last Session &mdash; {dateLabel}
        </div>
        <Link
          to={`/history/exercise/${exerciseId}`}
          className="text-accent-bright text-sm underline"
        >
          History &rarr;
        </Link>
      </div>
      <div
        className="grid gap-2 text-center font-mono text-sm"
        style={{ gridTemplateColumns: `repeat(${lastSession.sets.length}, 1fr)` }}
      >
        {lastSession.sets.map((s) => (
          <div key={s.set_number}>
            <div className="text-text-muted text-xs mb-1">SET {s.set_number}</div>
            <div className="text-text-primary">{formatWeight(s.weight_lbs)} lbs</div>
            <div className="text-text-primary">{s.reps} reps</div>
            <div className="text-text-muted">RPE {s.rpe}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
