import { useState, useCallback, useMemo } from 'react';
import { logSet as apiLogSet } from '../api/sets';
import { startExercise as apiStartExercise } from '../api/workouts';

export default function useWorkout(workout) {
  const [exercises, setExercises] = useState(workout?.exercises || []);
  const [currentIndex, setCurrentIndex] = useState(() => findResumeIndex(workout?.exercises));

  const currentExercise = exercises[currentIndex] || null;
  const totalExercises = exercises.length;

  // Determine which set number is next for the current exercise
  const nextSetNumber = useMemo(() => {
    if (!currentExercise) return 1;
    const logged = currentExercise.sets?.length || 0;
    return logged + 1;
  }, [currentExercise]);

  // Pre-fill values from last session's corresponding set
  const prefill = useMemo(() => {
    if (!currentExercise?.last_session?.sets) return { weight: '', reps: '' };
    const lastSet = currentExercise.last_session.sets.find(
      (s) => s.set_number === nextSetNumber
    );
    if (!lastSet) return { weight: '', reps: '' };
    return {
      weight: String(lastSet.weight_lbs),
      reps: String(lastSet.reps),
    };
  }, [currentExercise, nextSetNumber]);

  // Log a set for the current exercise
  const logSet = useCallback(
    async ({ weight, reps, rpe }) => {
      const ex = exercises[currentIndex];
      if (!ex) return null;

      // Auto-start exercise if pending
      if (ex.status === 'pending') {
        try {
          await apiStartExercise(workout.id, ex.id);
        } catch {
          // May already be started, continue
        }
      }

      const body = {
        set_number: (ex.sets?.length || 0) + 1,
        weight_lbs: parseFloat(weight),
        reps: parseInt(reps, 10),
        rpe: parseFloat(rpe),
        prescribed_rest_seconds: ex.rest_seconds,
      };

      const newSet = await apiLogSet(workout.id, ex.id, body);

      // Update local state with the new set
      setExercises((prev) =>
        prev.map((e, i) =>
          i === currentIndex
            ? { ...e, status: 'in_progress', sets: [...(e.sets || []), newSet] }
            : e
        )
      );

      return newSet;
    },
    [exercises, currentIndex, workout?.id]
  );

  const goToExercise = useCallback(
    (index) => {
      if (index >= 0 && index < totalExercises) {
        setCurrentIndex(index);
      }
    },
    [totalExercises]
  );

  const goNext = useCallback(() => goToExercise(currentIndex + 1), [currentIndex, goToExercise]);
  const goPrev = useCallback(() => goToExercise(currentIndex - 1), [currentIndex, goToExercise]);

  return {
    exercises,
    setExercises,
    currentExercise,
    currentIndex,
    totalExercises,
    nextSetNumber,
    prefill,
    logSet,
    goToExercise,
    goNext,
    goPrev,
  };
}

/** Find the first exercise that isn't completed/skipped to resume at. */
function findResumeIndex(exercises) {
  if (!exercises?.length) return 0;
  const idx = exercises.findIndex(
    (e) => e.status !== 'completed' && e.status !== 'partial' && e.status !== 'skipped'
  );
  return idx >= 0 ? idx : 0;
}
