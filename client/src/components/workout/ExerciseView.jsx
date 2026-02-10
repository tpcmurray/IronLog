import MuscleGroupBadge from '../common/MuscleGroupBadge';
import LastSessionCard from './LastSessionCard';
import SetList from './SetList';
import SetInput from './SetInput';
import RestTimer from './RestTimer';
import SupersetBanner from './SupersetBanner';

export default function ExerciseView({
  exercise,
  exerciseIndex,
  totalExercises,
  nextSetNumber,
  prefill,
  onLogSet,
  timer,
  onDismissTimer,
  onNextExercise,
  onAddExtraSet,
  onSkip,
  onPrev,
  isSuperset,
  prevExerciseName,
  isLastExercise,
}) {
  const isComplete =
    exercise.status === 'completed' || exercise.status === 'partial';
  const showTimer = timer && timer.mode !== 'idle';

  return (
    <div className="p-5 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="text-text-muted text-xs">
          Exercise {exerciseIndex + 1} of {totalExercises}
        </div>
        {!isComplete && (
          <button
            onClick={onSkip}
            className="bg-transparent text-progress-down border border-[#5f1e1e] rounded-lg px-4 py-2 text-[13px]"
          >
            Skip
          </button>
        )}
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

      {/* Superset banner */}
      {isSuperset && (
        <SupersetBanner prevExerciseName={prevExerciseName} />
      )}

      {/* Last Session (hidden during timer and when complete) */}
      {!isComplete && !showTimer && (
        <LastSessionCard
          lastSession={exercise.last_session}
          exerciseId={exercise.exercise_id}
        />
      )}

      {/* Set List */}
      <SetList
        sets={exercise.sets || []}
        targetSets={exercise.target_sets}
        nextSetNumber={nextSetNumber}
        isComplete={isComplete}
      />

      {/* Timer */}
      {showTimer && (
        <RestTimer
          mode={timer.mode}
          remaining={timer.remaining}
          elapsed={timer.elapsed}
          prescribed={timer.prescribed}
          nextSetNumber={nextSetNumber}
          targetSets={exercise.target_sets}
          onDismiss={onDismissTimer}
        />
      )}

      {/* Current set input (when not complete and timer not running) */}
      {!isComplete && !showTimer && (
        <SetInput
          setNumber={nextSetNumber}
          targetSets={exercise.target_sets}
          prefill={prefill}
          onLogSet={onLogSet}
        />
      )}

      {/* Exercise completion actions */}
      {isComplete && (
        <div className="mt-8">
          <button
            onClick={onNextExercise}
            className="w-full rounded-xl py-4 text-lg font-semibold text-white bg-accent mb-3"
          >
            {isLastExercise ? <>Finish Workout &#10003;</> : <>Next Exercise &rarr;</>}
          </button>
          <button
            onClick={onAddExtraSet}
            className="w-full rounded-xl py-3 text-sm font-medium text-accent border border-accent bg-transparent"
          >
            + Add Extra Set
          </button>
        </div>
      )}

      {/* Backward navigation */}
      {exerciseIndex > 0 && !showTimer && (
        <button
          onClick={onPrev}
          className="w-full mt-4 bg-transparent text-text-secondary font-medium text-[13px] py-2"
        >
          &larr; Previous Exercise
        </button>
      )}
    </div>
  );
}
