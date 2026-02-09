const { Router } = require('express');
const {
  startWorkout, getCurrentWorkout, completeWorkout,
  startExercise, skipExercise, completeExercise,
  getWorkoutHistory,
} = require('../controllers/workoutController');
const { logSet } = require('../controllers/setController');
const { requireFields, validateUuid } = require('../middleware/validate');

const router = Router();

router.post('/',
  requireFields('program_day_id'),
  startWorkout
);

router.get('/current', getCurrentWorkout);

router.get('/history', getWorkoutHistory);

router.put('/:id/complete',
  validateUuid('id'),
  completeWorkout
);

// Session exercise endpoints
router.put('/:workoutId/exercises/:sessionExerciseId/start',
  validateUuid('workoutId', 'sessionExerciseId'),
  startExercise
);

router.put('/:workoutId/exercises/:sessionExerciseId/skip',
  validateUuid('workoutId', 'sessionExerciseId'),
  skipExercise
);

router.put('/:workoutId/exercises/:sessionExerciseId/complete',
  validateUuid('workoutId', 'sessionExerciseId'),
  completeExercise
);

// Set logging
router.post('/:workoutId/exercises/:sessionExerciseId/sets',
  validateUuid('workoutId', 'sessionExerciseId'),
  requireFields('set_number', 'weight_lbs', 'reps', 'rpe'),
  logSet
);

module.exports = router;
