const router = require('express').Router();
const c = require('../controllers/customer.controller');
const devices = require('../controllers/device.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', c.list);
router.post('/', c.create);
router.get('/:id', c.get);
router.put('/:id', c.update);
router.get('/:id/devices', devices.listByCustomer);

module.exports = router;