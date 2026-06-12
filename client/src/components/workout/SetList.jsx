import { formatWeight } from '../../utils/formatters';

export default function SetList({ sets, targetSets, nextSetNumber, isComplete }) {
  const totalSets = Math.max(targetSets, sets.length);

  return (
    <div className="mb-4">
      {!isComplete && (
        <div className="text-text-primary text-lg font-semibold mb-3">
          Set {nextSetNumber} of {targetSets}
        </div>
      )}

      {/* Completed sets */}
      {sets.map((s) => (
        <div
          key={s.set_number}
          className="bg-bg-card-alt border border-border rounded-lg px-3 py-2.5 flex items-center justify-between mb-2"
        >
          <span className="text-sm text-text-muted">Set {s.set_number}</span>
          <span className="font-mono text-base text-text-primary">
            {formatWeight(s.weight_lbs)} lbs &times; {s.reps} reps @ RPE {s.rpe}
          </span>
          <span className="text-progress-up text-sm">&#10003;</span>
        </div>
      ))}

      {/* Upcoming sets (after current) */}
      {!isComplete &&
        Array.from({ length: totalSets - nextSetNumber }, (_, i) => {
          const setNum = nextSetNumber + 1 + i;
          return (
            <div
              key={`upcoming-${setNum}`}
              className="bg-bg-card-alt rounded-lg px-3 py-2.5 flex items-center justify-between mb-2"
            >
              <span className="text-sm text-text-muted">Set {setNum}</span>
              <span className="text-sm text-text-muted">&mdash;</span>
              <span />
            </div>
          );
        })}
    </div>
  );
}
