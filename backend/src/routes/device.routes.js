const router = require('express').Router();
const c = require('../controllers/device.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.post('/', c.create);
router.get('/:id', c.get);
router.put('/:id', c.update);

module.exports = router;