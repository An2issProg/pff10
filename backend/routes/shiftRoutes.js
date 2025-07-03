const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { openShift, closeShift, getSummary } = require('../controllers/shiftController');

router.post('/open', auth.protect, auth.travailleur, openShift);
router.post('/close', auth.protect, auth.travailleur, closeShift);
router.get('/summary', auth.protect, auth.travailleur, getSummary);

module.exports = router;
