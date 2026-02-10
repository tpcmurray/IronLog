import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCurrentWorkout } from '../api/workouts';
import useWorkout from '../hooks/useWorkout';
import useTimer from '../hooks/useTimer';
import useVibrate from '../hooks/useVibrate';
import useWakeLock from '../hooks/useWakeLock';
import ExerciseView from '../components/workout/ExerciseView';

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
    currentExercise,
    currentIndex,
    totalExercises,
    nextSetNumber,
    prefill,
    logSet,
  } = useWorkout(workout);

  const vibrate = useVibrate();
  const timer = useTimer({ onZero: vibrate });
  const [pendingRestDuration, setPendingRestDuration] = useState(null);

  // Keep screen awake during workout
  useWakeLock(true);

  // Wrap logSet to include rest duration from timer and auto-start timer after
  const handleLogSet = useCallback(
    async (setData) => {
      const dataWithRest = { ...setData };
      if (pendingRestDuration != null) {
        dataWithRest.restDurationSeconds = pendingRestDuration;
        setPendingRestDuration(null);
      }

      const newSet = await logSet(dataWithRest);
      if (!newSet) return;

      // Auto-start timer if there are more sets to do (not the last set)
      const setsLogged = (currentExercise?.sets?.length || 0) + 1;
      const isLastSet = setsLogged >= currentExercise.target_sets;
      if (!isLastSet && currentExercise.rest_seconds) {
        timer.start(currentExercise.rest_seconds);
      }
    },
    [logSet, pendingRestDuration, currentExercise, timer]
  );

  const handleDismissTimer = useCallback(() => {
    const elapsed = timer.dismiss();
    setPendingRestDuration(elapsed);
  }, [timer]);

  if (!currentExercise) {
    return (
      <div className="p-6 pt-14 text-center">
        <p className="text-text-muted text-sm">No exercises found.</p>
      </div>
    );
  }

  return (
    <ExerciseView
      exercise={currentExercise}
      exerciseIndex={currentIndex}
      totalExercises={totalExercises}
      nextSetNumber={nextSetNumber}
      prefill={prefill}
      onLogSet={handleLogSet}
      timer={timer}
      onDismissTimer={handleDismissTimer}
    />
  );
}
