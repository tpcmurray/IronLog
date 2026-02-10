import { useState, useCallback, useMemo } from 'react';
import { logSet as apiLogSet } from '../api/sets';
import {
  startExercise as apiStartExercise,
  completeExercise as apiCompleteExercise,
  skipExercise as apiSkipExercise,
} from '../api/workouts';

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

  // Pre-fill weight from last logged set in this exercise, falling back to last session
  const prefill = useMemo(() => {
    const loggedSets = currentExercise?.sets;
    const lastLogged = loggedSets?.length > 0 ? loggedSets[loggedSets.length - 1] : null;

    const lastSessionSet = currentExercise?.last_session?.sets?.find(
      (s) => s.set_number === nextSetNumber
    );

    const weight = lastLogged
      ? String(lastLogged.weight_lbs)
      : lastSessionSet
        ? String(lastSessionSet.weight_lbs)
        : '';

    const reps = lastSessionSet ? String(lastSessionSet.reps) : '';

    return { weight, reps };
  }, [currentExercise, nextSetNumber]);

  // Log a set for the current exercise
  const logSet = useCallback(
    async ({ weight, reps, rpe, restDurationSeconds }) => {
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

      if (restDurationSeconds != null) {
        body.rest_duration_seconds = restDurationSeconds;
      }

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

  // Complete current exercise via API and update local state
  const completeCurrentExercise = useCallback(async () => {
    const ex = exercises[currentIndex];
    if (!ex) return;
    if (ex.status === 'completed' || ex.status === 'partial' || ex.status === 'skipped') return;
    await apiCompleteExercise(workout.id, ex.id);
    const newStatus = (ex.sets?.length || 0) < ex.target_sets ? 'partial' : 'completed';
    setExercises((prev) =>
      prev.map((e, i) => (i === currentIndex ? { ...e, status: newStatus } : e))
    );
  }, [exercises, currentIndex, workout?.id]);

  // Skip current exercise via API and advance
  const skipCurrentExercise = useCallback(
    async (reason) => {
      const ex = exercises[currentIndex];
      if (!ex) return;
      await apiSkipExercise(workout.id, ex.id, reason);
      setExercises((prev) =>
        prev.map((e, i) =>
          i === currentIndex ? { ...e, status: 'skipped', skip_reason: reason } : e
        )
      );
    },
    [exercises, currentIndex, workout?.id]
  );

  // Increment target_sets locally so the user can log an extra set
  const addExtraSet = useCallback(() => {
    setExercises((prev) =>
      prev.map((e, i) =>
        i === currentIndex
          ? { ...e, status: 'in_progress', target_sets: e.target_sets + 1 }
          : e
      )
    );
  }, [currentIndex]);

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

  // Check if all exercises are done (for navigating to completion)
  const allDone = useMemo(
    () =>
      exercises.length > 0 &&
      exercises.every(
        (e) => e.status === 'completed' || e.status === 'partial' || e.status === 'skipped'
      ),
    [exercises]
  );

  return {
    exercises,
    setExercises,
    currentExercise,
    currentIndex,
    totalExercises,
    nextSetNumber,
    prefill,
    logSet,
    completeCurrentExercise,
    skipCurrentExercise,
    addExtraSet,
    allDone,
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
