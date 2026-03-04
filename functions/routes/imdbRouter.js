const express = require('express');
const router = express.Router();
const cors = require('./cors');
const authenticate = require('../authenticate');
const config = require('../config');
const cache = require('../cache');

const IMDB_HOST = 'imdb8.p.rapidapi.com';
const HEADERS = {
    'x-rapidapi-host': IMDB_HOST,
    'x-rapidapi-key': config.rapidApiKey
};

// GET /imdb?title=X&year=Y
router.options('/', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/', cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    const { title, year } = req.query;
    if (!title || !year) return res.status(400).json({ error: 'title and year required' });

    const cacheKey = `imdb:${title}:${year}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const yearNum = parseInt(year);

        const autocompleteRes = await fetch(`https://${IMDB_HOST}/auto-complete?q=${encodeURIComponent(title)}`, {
            headers: HEADERS
        });
        if (!autocompleteRes.ok) throw new Error('IMDb autocomplete error ' + autocompleteRes.status);
        const autocompleteData = await autocompleteRes.json();

        let items = autocompleteData.d.filter(el => el.l === title && el.y === yearNum);
        if (!items.length) items = autocompleteData.d.filter(el => el.l === title && Math.abs((el.y || 0) - yearNum) <= 1);
        if (!items.length) items = autocompleteData.d.filter(el => el.l === title);
        if (!items.length) throw new Error('Film not found on IMDb');

        const id = items[0].id;

        const detailRes = await fetch(`https://${IMDB_HOST}/title/get-overview-details?tconst=${id}&currentCountry=IT`, {
            headers: HEADERS
        });
        if (!detailRes.ok) throw new Error('IMDb detail error ' + detailRes.status);
        const data = await detailRes.json();

        const result = {
            imdbId: data.id,
            imdbRating: data.ratings.rating,
            imdbRatingCount: data.ratings.ratingCount
        };
        await cache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
