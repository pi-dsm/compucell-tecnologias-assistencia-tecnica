const router = require('express').Router();
const c = require('../controllers/dashboard.controller');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/summary', c.summary);
router.get('/sales', authorize('admin'), c.salesAnalytics);
router.get('/goals', c.getGoals);
router.put('/goals', authorize('admin'), c.updateGoals);

module.exports = router;