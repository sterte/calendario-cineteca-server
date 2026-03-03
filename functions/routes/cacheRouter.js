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

// GET /cache/content  (admin only)
router.options('/content', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/content', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res) => {
    res.json(cache.getContent());
});

// DELETE /cache?prefix=X  (admin only) — clears all entries or only those matching prefix
router.options('/', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.delete('/', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res) => {
    const { prefix } = req.query;
    cache.clear(prefix || null);
    res.json({ cleared: true, prefix: prefix || 'all' });
});

module.exports = router;
