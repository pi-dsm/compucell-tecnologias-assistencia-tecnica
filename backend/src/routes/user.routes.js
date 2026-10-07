const router = require('express').Router();
const c = require('../controllers/user.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate, authorize('admin'));
router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.patch('/:id/toggle-status', c.toggleStatus);

module.exports = router;