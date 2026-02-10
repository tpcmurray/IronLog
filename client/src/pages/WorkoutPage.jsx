import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentWorkout, completeWorkout as apiCompleteWorkout } from '../api/workouts';
import useWorkout from '../hooks/useWorkout';
import useTimer from '../hooks/useTimer';
import useVibrate from '../hooks/useVibrate';
import useWakeLock from '../hooks/useWakeLock';
import ExerciseView from '../components/workout/ExerciseView';
import SkipModal from '../components/workout/SkipModal';
import WorkoutComplete from '../components/workout/WorkoutComplete';

export default function WorkoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getCurrentWorkout();
        if (!data || data.id !== id) {
          navigate('/', { replace: true });
          return;
        }
        setWorkout(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">Loading workout...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-progress-down text-sm">{error}</p>
      </div>
    );
  }

  if (!workout) return null;

  return <WorkoutContent workout={workout} />;
}

function WorkoutContent({ workout }) {
  const {
    exercises,
    currentExercise,
    currentIndex,
    totalExercises,
    nextSetNumber,
    prefill,
    logSet,
    completeCurrentExercise,
    skipCurrentExercise,
    addExtraSet,
    goNext,
    goPrev,
  } = useWorkout(workout);

  const vibrate = useVibrate();
  const timer = useTimer({ onZero: vibrate });
  const [pendingRestDuration, setPendingRestDuration] = useState(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isSuperset, setIsSuperset] = useState(false);
  const [completionResult, setCompletionResult] = useState(null);
  const [completing, setCompleting] = useState(false);

  // Keep screen awake during active workout (not on completion screen)
  useWakeLock(!completionResult);

  const isLastExercise = currentIndex >= totalExercises - 1;

  // Complete the entire workout via API
  const finishWorkout = useCallback(async () => {
    setCompleting(true);
    try {
      // Complete current exercise first if not already
      const curEx = exercises[currentIndex];
      if (curEx && curEx.status !== 'completed' && curEx.status !== 'partial' && curEx.status !== 'skipped') {
        await completeCurrentExercise();
      }
      const result = await apiCompleteWorkout(workout.id);
      timer.reset();
      setCompletionResult(result);
    } catch {
      // If already completed (409), still show completion
      try {
        const result = await apiCompleteWorkout(workout.id);
        setCompletionResult(result);
      } catch {
        // Fallback — just go home
        setCompletionResult(null);
      }
    } finally {
      setCompleting(false);
    }
  }, [exercises, currentIndex, completeCurrentExercise, workout.id, timer]);

  // Advance to next exercise, handling completion + superset auto-advance
  const advanceToNext = useCallback(async () => {
    await completeCurrentExercise();
    timer.reset();
    setPendingRestDuration(null);

    if (isLastExercise) {
      // Last exercise done — complete the whole workout
      await finishWorkout();
      return;
    }

    // Check if current exercise has superset_with_next
    const curEx = exercises[currentIndex];
    if (curEx?.superset_with_next) {
      setIsSuperset(true);
    } else {
      setIsSuperset(false);
    }

    goNext();
  }, [completeCurrentExercise, timer, isLastExercise, exercises, currentIndex, goNext, finishWorkout]);

  // Wrap logSet to include rest duration and auto-start timer / auto-advance
  const handleLogSet = useCallback(
    async (setData) => {
      const dataWithRest = { ...setData };
      if (pendingRestDuration != null) {
        dataWithRest.restDurationSeconds = pendingRestDuration;
        setPendingRestDuration(null);
      }

      const newSet = await logSet(dataWithRest);
      if (!newSet) return;

      // Check if this was the last prescribed set
      const setsLogged = (currentExercise?.sets?.length || 0) + 1;
      const isLastSet = setsLogged >= currentExercise.target_sets;

      if (isLastSet) {
        // If superset, auto-complete and advance immediately (no timer)
        if (currentExercise.superset_with_next && !isLastExercise) {
          await completeCurrentExercise();
          timer.reset();
          setPendingRestDuration(null);
          setIsSuperset(true);
          goNext();
        } else {
          // Complete the exercise so Next Exercise / Add Extra Set buttons appear
          await completeCurrentExercise();
        }
      } else if (currentExercise.rest_seconds) {
        // Not last set — start rest timer
        timer.start(currentExercise.rest_seconds);
      }
    },
    [logSet, pendingRestDuration, currentExercise, timer, completeCurrentExercise, isLastExercise, goNext]
  );

  const handleDismissTimer = useCallback(() => {
    const elapsed = timer.dismiss();
    setPendingRestDuration(elapsed);
  }, [timer]);

  const handleSkip = useCallback(
    async (reason) => {
      setShowSkipModal(false);
      await skipCurrentExercise(reason);
      timer.reset();
      setPendingRestDuration(null);

      if (isLastExercise) {
        await finishWorkout();
      } else {
        setIsSuperset(false);
        goNext();
      }
    },
    [skipCurrentExercise, timer, isLastExercise, goNext, finishWorkout]
  );

  const handlePrev = useCallback(() => {
    timer.reset();
    setPendingRestDuration(null);
    setIsSuperset(false);
    goPrev();
  }, [timer, goPrev]);

  const handleNextExercise = useCallback(async () => {
    await advanceToNext();
  }, [advanceToNext]);

  const handleAddExtraSet = useCallback(() => {
    addExtraSet();
  }, [addExtraSet]);

  // Show completion screen
  if (completionResult) {
    return <WorkoutComplete result={completionResult} />;
  }

  if (completing) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">Completing workout...</p>
      </div>
    );
  }

  if (!currentExercise) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">No exercises found.</p>
      </div>
    );
  }

  // Get previous exercise name for superset banner
  const prevExerciseName =
    isSuperset && currentIndex > 0
      ? exercises[currentIndex - 1]?.exercise_name
      : null;

  return (
    <>
      <ExerciseView
        exercise={currentExercise}
        exerciseIndex={currentIndex}
        totalExercises={totalExercises}
        nextSetNumber={nextSetNumber}
        prefill={prefill}
        onLogSet={handleLogSet}
        timer={timer}
        onDismissTimer={handleDismissTimer}
        onNextExercise={handleNextExercise}
        onAddExtraSet={handleAddExtraSet}
        onSkip={() => setShowSkipModal(true)}
        onPrev={handlePrev}
        isSuperset={isSuperset}
        prevExerciseName={prevExerciseName}
        isLastExercise={isLastExercise}
      />

      {showSkipModal && (
        <SkipModal
          exerciseName={currentExercise.exercise_name}
          onConfirm={handleSkip}
          onCancel={() => setShowSkipModal(false)}
        />
      )}
    </>
  );
}
