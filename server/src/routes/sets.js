const { Router } = require('express');
const { editSet, deleteSet } = require('../controllers/setController');
const { validateUuid } = require('../middleware/validate');

const router = Router();

router.put('/:id',
  validateUuid('id'),
  editSet
);

router.delete('/:id',
  validateUuid('id'),
  deleteSet
);

module.exports = router;
