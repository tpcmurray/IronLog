const { Router } = require('express');
const { listExercises, createExercise, updateExercise, getLastSession, getExerciseHistory } = require('../controllers/exerciseController');
const { requireFields, validateUuid, validatePositiveNumber } = require('../middleware/validate');

const router = Router();

router.get('/', listExercises);

router.post('/',
  requireFields('name', 'muscle_group'),
  validatePositiveNumber('default_rest_seconds'),
  createExercise
);

router.put('/:id',
  validateUuid('id'),
  validatePositiveNumber('default_rest_seconds'),
  updateExercise
);

router.get('/:id/last-session',
  validateUuid('id'),
  getLastSession
);

router.get('/:id/history',
  validateUuid('id'),
  getExerciseHistory
);

module.exports = router;
