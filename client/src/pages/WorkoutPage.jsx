import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentWorkout } from '../api/workouts';
import useWorkout from '../hooks/useWorkout';
import useTimer from '../hooks/useTimer';
import useVibrate from '../hooks/useVibrate';
import useWakeLock from '../hooks/useWakeLock';
import ExerciseView from '../components/workout/ExerciseView';
import SkipModal from '../components/workout/SkipModal';

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
  const navigate = useNavigate();
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

  // Keep screen awake during workout
  useWakeLock(true);

  const isLastExercise = currentIndex >= totalExercises - 1;

  // Advance to next exercise, handling completion + superset auto-advance
  const advanceToNext = useCallback(async () => {
    // Complete current exercise first
    await completeCurrentExercise();
    timer.reset();
    setPendingRestDuration(null);

    if (isLastExercise) {
      // All done — Phase 17 will handle workout completion
      navigate(`/workout/${workout.id}`);
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
  }, [completeCurrentExercise, timer, isLastExercise, exercises, currentIndex, goNext, navigate, workout.id]);

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
        }
        // Otherwise show completion buttons (no timer auto-start)
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

      if (!isLastExercise) {
        setIsSuperset(false);
        goNext();
      }
    },
    [skipCurrentExercise, timer, isLastExercise, goNext]
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
