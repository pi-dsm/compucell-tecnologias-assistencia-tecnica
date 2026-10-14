const router = require('express').Router();
const c = require('../controllers/serviceOrder.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.patch('/:id/status', c.updateStatus);
router.patch('/:id/ready', c.markReady);
router.patch('/:id/deliver', c.deliver);
router.post('/:id/payments', c.addPayment);
router.post('/:id/return', c.registerReturn);
router.get('/:id/receipt.pdf', c.receiptPdf);
router.get('/:id/warranty.pdf', c.warrantyPdf);
router.delete('/:id', c.remove);

module.exports = router;