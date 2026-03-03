const express = require('express');
const router = express.Router();
const cors = require('./cors');
const authenticate = require('../authenticate');
const cache = require('../cache');

// GET /cache/stats  (admin only)
router.options('/stats', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/stats', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res) => {
    res.json(cache.getStats());
});

module.exports = router;
