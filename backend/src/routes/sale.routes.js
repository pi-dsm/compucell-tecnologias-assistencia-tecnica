const router = require('express').Router();
const c = require('../controllers/sale.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.post('/:id/payments', c.addPayment);
router.get('/items', authorize('admin'), c.itemRows);
router.get('/:id', c.get);
router.patch('/:id/refund', authenticate, c.refund);

module.exports = router;