const router = require('express').Router();
const c = require('../controllers/sale.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', c.create);
router.get('/', c.list);
router.get('/:id', c.get);
router.patch('/:id/refund', c.refund);

module.exports = router;