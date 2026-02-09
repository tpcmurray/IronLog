const { Router } = require('express');
const {
  startWorkout, getCurrentWorkout, completeWorkout,
  startExercise, skipExercise, completeExercise,
} = require('../controllers/workoutController');
const { requireFields, validateUuid } = require('../middleware/validate');

const router = Router();

router.post('/',
  requireFields('program_day_id'),
  startWorkout
);

router.get('/current', getCurrentWorkout);

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

module.exports = router;
