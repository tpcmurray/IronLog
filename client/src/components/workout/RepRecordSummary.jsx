import { formatWeight } from '../../utils/formatters';

function formatRecordDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Shows today's total reps at the current weight next to the best past day
 * at that same weight. Highlights green when today beats the record.
 *
 * record: { weight_lbs, today_total_reps, best_total_reps, best_date }
 */
export default function RepRecordSummary({ record, compact = false }) {
  if (!record || record.weight_lbs == null) return null;

  const { weight_lbs, today_total_reps, best_total_reps, best_date } = record;
  const isRecord = best_total_reps != null && today_total_reps > best_total_reps;
  const isTie = best_total_reps != null && today_total_reps === best_total_reps;

  if (compact) {
    return (
      <div className="font-mono text-sm mt-2">
        <span className={isRecord ? 'text-progress-up' : 'text-text-secondary'}>
          {today_total_reps} reps @ {formatWeight(weight_lbs)} lbs
        </span>
        <span className="text-text-muted">
          {' '}&middot;{' '}
          {best_total_reps != null
            ? <>best: {best_total_reps}</>
            : <>first time at this weight</>}
        </span>
        {isRecord && <span className="text-progress-up"> &#9650; new best!</span>}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-4 mb-4 ${
        isRecord
          ? 'bg-success-bg border-success-border'
          : 'bg-bg-card-alt border-border'
      }`}
    >
      <div className="text-text-muted text-xs font-medium tracking-widest uppercase mb-2">
        Total Reps @ {formatWeight(weight_lbs)} lbs
      </div>
      <div className="flex items-baseline gap-3">
        <span
          className={`font-mono text-2xl font-bold ${
            isRecord ? 'text-progress-up' : 'text-text-primary'
          }`}
        >
          {today_total_reps}
        </span>
        {best_total_reps != null ? (
          <span className="text-text-secondary text-base">
            best: {best_total_reps} ({formatRecordDate(best_date)})
          </span>
        ) : (
          <span className="text-text-muted text-base">
            first time at this weight
          </span>
        )}
      </div>
      {isRecord && (
        <div className="text-progress-up text-sm font-medium mt-1">
          &#9650; New best at this weight!
        </div>
      )}
      {isTie && (
        <div className="text-progress-same text-sm mt-1">
          Tied your best
        </div>
      )}
    </div>
  );
}
