const { Router } = require('express');
const { getActiveProgram, updateProgram } = require('../controllers/programController');
const { requireFields, validateUuid } = require('../middleware/validate');

const router = Router();

router.get('/active', getActiveProgram);

router.put('/:id',
  validateUuid('id'),
  requireFields('days'),
  updateProgram
);

module.exports = router;
