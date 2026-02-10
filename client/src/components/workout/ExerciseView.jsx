import MuscleGroupBadge from '../common/MuscleGroupBadge';
import LastSessionCard from './LastSessionCard';
import SetList from './SetList';
import SetInput from './SetInput';

export default function ExerciseView({
  exercise,
  exerciseIndex,
  totalExercises,
  nextSetNumber,
  prefill,
  onLogSet,
}) {
  const isComplete =
    exercise.status === 'completed' || exercise.status === 'partial';

  return (
    <div className="p-5 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-text-muted text-xs">
          Exercise {exerciseIndex + 1} of {totalExercises}
        </div>
        {/* Skip button will be added in Phase 16 */}
      </div>
      <div className="flex items-center gap-3 mb-1">
        <h2 className="text-white text-[22px] font-bold">{exercise.exercise_name}</h2>
      </div>
      <div className="flex items-center gap-2 mb-5">
        <MuscleGroupBadge group={exercise.muscle_group} />
        {isComplete && (
          <span className="text-progress-up text-[13px] font-medium">&#10003; Complete</span>
        )}
      </div>

      {/* Last Session */}
      {!isComplete && (
        <LastSessionCard
          lastSession={exercise.last_session}
          exerciseId={exercise.exercise_id}
        />
      )}

      {/* Set List + Input */}
      <SetList
        sets={exercise.sets || []}
        targetSets={exercise.target_sets}
        nextSetNumber={nextSetNumber}
        isComplete={isComplete}
      />

      {/* Current set input (when not complete) */}
      {!isComplete && (
        <SetInput
          setNumber={nextSetNumber}
          targetSets={exercise.target_sets}
          prefill={prefill}
          onLogSet={onLogSet}
        />
      )}
    </div>
  );
}
