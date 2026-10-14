const router = require('express').Router();
const c = require('../controllers/product.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.get('/barcode/:code', c.getByBarcode); // antes de '/:id'
router.get('/:id', c.get);
router.get('/:id/movements', c.movements);
router.post('/', authorize('admin', 'attendant'), c.create);
router.put('/:id', authorize('admin', 'attendant'), c.update);
router.patch('/:id/stock', authorize('admin', 'attendant'), c.adjustStock);
router.delete('/:id', authorize('admin'), c.remove);

module.exports = router;