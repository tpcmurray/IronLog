import { formatWeight } from '../../utils/formatters';
import MuscleGroupBadge from '../common/MuscleGroupBadge';

export default function NextExercisePreview({ nextExercise }) {
  const lastWeight = nextExercise.last_session?.sets?.[0]?.weight_lbs;

  return (
    <div className="mt-4 bg-bg-card-alt border border-border rounded-lg p-3">
      <div className="text-text-muted text-xs font-medium tracking-widest uppercase mb-2">
        Next Exercise
      </div>
      <div className="flex items-center gap-2 mb-1">
        <MuscleGroupBadge group={nextExercise.muscle_group} />
        <span className="text-text-primary text-base font-medium">
          {nextExercise.exercise_name}
        </span>
      </div>
      {lastWeight ? (
        <div className="text-text-secondary text-sm">
          Last: {formatWeight(lastWeight)} lbs
        </div>
      ) : (
        <div className="text-text-muted text-sm">
          No previous data
        </div>
      )}
    </div>
  );
}
