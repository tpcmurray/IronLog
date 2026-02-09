const { Router } = require('express');
const { startWorkout, getCurrentWorkout, completeWorkout } = require('../controllers/workoutController');
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

module.exports = router;
