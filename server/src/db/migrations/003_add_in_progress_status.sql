-- The app sets session_exercises.status = 'in_progress' when an exercise is
-- started (workoutController.startExercise), but the original check constraint
-- omitted that value, causing every start-exercise call to fail with a 500.
ALTER TABLE session_exercises
    DROP CONSTRAINT session_exercises_status_check;

ALTER TABLE session_exercises
    ADD CONSTRAINT session_exercises_status_check
    CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'partial'));
