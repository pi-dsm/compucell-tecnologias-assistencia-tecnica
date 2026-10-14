const router = require('express').Router();
const c = require('../controllers/sale.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.post('/:id/payments', c.addPayment);
router.patch('/:id/refund', authorize('admin'), c.refund);

module.exports = router;