const express = require('express');
const router = express.Router();
const cors = require('./cors');
const authenticate = require('../authenticate');
const cache = require('../cache');

// GET /cache/stats  (admin only)
router.options('/stats', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/stats', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, async (req, res, next) => {
    try { res.json(await cache.getStats()); } catch (err) { next(err); }
});

// GET /cache/content  (admin only)
router.options('/content', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/content', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, async (req, res, next) => {
    try { res.json(await cache.getContent()); } catch (err) { next(err); }
});

// DELETE /cache?prefix=X  (admin only)
router.options('/', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.delete('/', cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, async (req, res, next) => {
    try {
        const { prefix } = req.query;
        await cache.clear(prefix || null);
        res.json({ cleared: true, prefix: prefix || 'all' });
    } catch (err) { next(err); }
});

module.exports = router;
