const router = require('express').Router();
const c = require('../controllers/supplier.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.get('/:id', c.get);
router.post('/', authorize('admin', 'attendant'), c.create);
router.put('/:id', authorize('admin', 'attendant'), c.update);
router.patch('/:id/status', authorize('admin', 'attendant'), c.setStatus);

module.exports = router;