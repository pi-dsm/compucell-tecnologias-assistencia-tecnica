const router = require('express').Router();
router.get('/service-orders/:number', require('../controllers/public.controller').track);
module.exports = router;