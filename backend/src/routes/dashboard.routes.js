const router = require('express').Router();
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, require('../controllers/dashboard.controller').summary);
module.exports = router;