import { formatWeight } from '../../utils/formatters';

// Compact "what did I do for this set last time" line, shared by RestTimer and SetInput.
export default function LastTimeSet({ lastSession, setNumber, variant = 'inset' }) {
  if (!lastSession) return null;

  const set = lastSession.sets?.find((s) => s.set_number === setNumber);
  const dateLabel = new Date(lastSession.date)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    .toUpperCase();

  if (variant === 'line') {
    return (
      <div className="text-text-secondary text-sm mb-3">
        {set ? (
          <>
            Last time:{' '}
            <span className="font-mono text-text-primary">
              {formatWeight(set.weight_lbs)} lbs &times; {set.reps} reps @ RPE {set.rpe}
            </span>
          </>
        ) : (
          <>No set {setNumber} last time</>
        )}
      </div>
    );
  }

  return (
    <div className="bg-bg-card-alt border border-border rounded-lg px-3 py-2.5 mt-4 text-left">
      <div className="text-accent-bright text-xs font-medium tracking-widest uppercase mb-1">
        Last Time &middot; {dateLabel} &middot; Set {setNumber}
      </div>
      <div className="font-mono text-base text-text-primary">
        {set ? (
          <>{formatWeight(set.weight_lbs)} lbs &times; {set.reps} reps @ RPE {set.rpe}</>
        ) : (
          <span className="text-text-muted text-sm font-sans">No set {setNumber} last time</span>
        )}
      </div>
    </div>
  );
}
