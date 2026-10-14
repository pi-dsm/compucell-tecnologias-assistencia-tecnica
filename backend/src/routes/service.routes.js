const router = require('express').Router();
const c = require('../controllers/service.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.post('/', authorize('admin', 'attendant'), c.create);
router.put('/:id', authorize('admin', 'attendant'), c.update);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;