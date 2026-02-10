import { useNavigate } from 'react-router-dom';
import MuscleGroupBadge from '../common/MuscleGroupBadge';
import { formatWeight, formatDuration } from '../../utils/formatters';

export default function WorkoutComplete({ result }) {
  const navigate = useNavigate();
  const { progression, duration_minutes, started_at } = result;

  const dateLabel = new Date(started_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="p-5 pt-10">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">&#128170;</div>
        <h2 className="text-white text-2xl font-bold">Workout Complete</h2>
        <div className="text-text-muted text-[13px] mt-1">
          {dateLabel} &middot; {formatDuration(duration_minutes)}
        </div>
      </div>

      {/* Progression indicator */}
      <div className="bg-[#0d2818] border border-[#166534] rounded-xl p-4 text-center mb-5">
        <div className="text-progress-up text-[28px] font-bold">
          {progression.progressed} of {progression.total_exercises - progression.skipped}
        </div>
        <div className="text-progress-up text-[13px] mt-0.5">
          exercises progressed vs. last session
        </div>
      </div>

      {/* Summary */}
      <div className="text-text-secondary text-xs tracking-widest uppercase mb-2">
        Summary
      </div>

      {progression.details.map((ex, i) => (
        <ExerciseSummaryCard
          key={i}
          detail={ex}
          sets={result.exercises?.find(
            (e) => e.exercise_name === ex.exercise_name
          )?.sets}
        />
      ))}

      {/* Done button */}
      <div className="h-4" />
      <button
        onClick={() => navigate('/')}
        className="w-full rounded-xl py-4 text-lg font-semibold text-white bg-accent"
      >
        Done
      </button>
    </div>
  );
}

const PROGRESSION_LABELS = {
  progressed: { text: '\u2191 progressed', cls: 'text-progress-up' },
  first_time: { text: '\u2191 first time', cls: 'text-progress-up' },
  same: { text: '\u2014 same', cls: 'text-progress-same' },
  regressed: { text: '\u2193 regressed', cls: 'text-progress-down' },
  skipped: { text: 'skipped', cls: 'text-text-muted' },
};

function ExerciseSummaryCard({ detail, sets }) {
  const label = PROGRESSION_LABELS[detail.status] || PROGRESSION_LABELS.same;

  return (
    <div
      className={`bg-[#1a1a30] rounded-lg p-3 mb-2 ${
        detail.status === 'skipped' ? 'opacity-35' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MuscleGroupBadge group={detail.muscle_group} />
          <span
            className={`text-text-primary text-sm font-medium ${
              detail.status === 'skipped' ? 'line-through' : ''
            }`}
          >
            {detail.exercise_name}
          </span>
        </div>
        <span className={`text-xs ${label.cls}`}>{label.text}</span>
      </div>

      {detail.status === 'skipped' ? (
        detail.skip_reason && (
          <div className="text-text-muted text-xs">{detail.skip_reason}</div>
        )
      ) : sets?.length > 0 ? (
        <div
          className="grid gap-2 font-mono text-[11px] text-text-secondary"
          style={{ gridTemplateColumns: `repeat(${sets.length}, 1fr)` }}
        >
          {sets.map((s) => (
            <div key={s.set_number}>
              {formatWeight(s.weight_lbs)}&times;{s.reps} R{s.rpe}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
