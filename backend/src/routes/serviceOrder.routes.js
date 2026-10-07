const router = require('express').Router();
const c = require('../controllers/serviceOrder.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', c.create);
router.get('/', c.list);
router.get('/customers/search', c.searchCustomers);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.patch('/:id/status', c.updateStatus);
router.patch('/:id/parts', c.updateParts);
router.patch('/:id/payments', c.addPayment);
router.delete('/:id', c.remove);

module.exports = router;