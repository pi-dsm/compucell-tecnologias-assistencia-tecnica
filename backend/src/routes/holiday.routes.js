const router = require('express').Router();
const c = require('../controllers/holiday.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.get('/preview', c.preview);
router.post('/', authorize('admin'), c.create);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;