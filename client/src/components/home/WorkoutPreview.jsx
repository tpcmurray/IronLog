import MuscleGroupBadge from '../common/MuscleGroupBadge';

export default function WorkoutPreview({ exercises, inProgress }) {
  return (
    <div className="bg-[#1a1a30] border border-border rounded-2xl p-5 mb-6">
      {inProgress ? (
        <div className="text-progress-same text-xs tracking-widest uppercase mb-3">
          &#9203; Workout In Progress
        </div>
      ) : (
        <div className="text-text-secondary text-xs tracking-widest uppercase mb-3">
          Today&#39;s Workout
        </div>
      )}

      {exercises.map((ex, i) => (
        <div key={ex.id} className={`flex items-center gap-3 ${i < exercises.length - 1 ? 'mb-4' : ''}`}>
          <MuscleGroupBadge group={ex.muscle_group} />
          <ExerciseStatus ex={ex} inProgress={inProgress} />
        </div>
      ))}
    </div>
  );
}

function ExerciseStatus({ ex, inProgress }) {
  if (!inProgress) {
    return (
      <span className="text-[#c0c0d8] text-sm">
        {ex.exercise_name} &mdash; {ex.target_sets} sets
      </span>
    );
  }

  if (ex.status === 'completed' || ex.status === 'partial') {
    return (
      <span className="text-progress-up text-sm">
        &#10003; {ex.exercise_name} &mdash; done
      </span>
    );
  }

  if (ex.status === 'in_progress') {
    const setsLogged = ex.sets?.length || 0;
    return (
      <span className="text-progress-same text-sm">
        &#9679; {ex.exercise_name} &mdash; set {setsLogged} of {ex.target_sets}
      </span>
    );
  }

  if (ex.status === 'skipped') {
    return (
      <span className="text-text-muted text-sm line-through">
        {ex.exercise_name} &mdash; skipped
      </span>
    );
  }

  // pending
  return (
    <span className="text-text-muted text-sm">
      {ex.exercise_name} &mdash; not started
    </span>
  );
}
