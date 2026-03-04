const express = require('express');
const router = express.Router();
const cors = require('./cors');
const authenticate = require('../authenticate');
const config = require('../config');
const cache = require('../cache');

const LB_HOST = 'letterboxd9.p.rapidapi.com';
const HEADERS = {
    'x-rapidapi-host': LB_HOST,
    'x-rapidapi-key': config.rapidApiKey
};

// GET /letterboxd/film?title=X&year=Y
router.options('/film', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/film', cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    const { title, year } = req.query;
    if (!title || !year) return res.status(400).json({ error: 'title and year required' });

    const cacheKey = `lb:film:${title}:${year}`;
    const cached = await cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
        const yearNum = parseInt(year);
        const searchRes = await fetch(
            `https://${LB_HOST}/api/letterboxd/search?input=${encodeURIComponent(title)}`,
            { headers: HEADERS }
        );
        if (!searchRes.ok) throw new Error('Letterboxd search error ' + searchRes.status);
        const data = await searchRes.json();

        const searchItems = Array.isArray(data.results) ? data.results
            : Array.isArray(data.items) ? data.items
            : Array.isArray(data) ? data : [];

        const filmItems = searchItems
            .filter(el => el.type === 'FilmSearchResult' || el.film)
            .map(el => el.film || el);

        let match = filmItems.find(el => el.name === title && el.releaseYear === yearNum);
        if (!match) match = filmItems.find(el => el.name === title && Math.abs((el.releaseYear || 0) - yearNum) <= 1);
        if (!match) match = filmItems[0];
        if (!match) throw new Error('Film not found on Letterboxd');

        const slug = match.id || match.slug;
        const rawRating = match.rating;
        const lbRating = typeof rawRating === 'number' ? rawRating
            : (rawRating?.value !== undefined ? rawRating.value : null);
        const lbUrl = match.links?.[0]?.url || match.link || match.url || `https://letterboxd.com/film/${slug}/`;

        const result = { lbSlug: slug, lbRating, lbUrl };
        await cache.set(cacheKey, result);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// GET /letterboxd/watchlist?username=X&filmSlug=Y
router.options('/watchlist', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });
router.get('/watchlist', cors.corsWithOptions, authenticate.verifyUser, async (req, res, next) => {
    const { username, filmSlug } = req.query;
    if (!username || !filmSlug) return res.status(400).json({ error: 'username and filmSlug required' });

    try {
        // Step 1: resolve username → memberId (cached)
        const memberKey = `lb:member:${username.toLowerCase()}`;
        let memberData = await cache.get(memberKey);
        if (!memberData) {
            const memberRes = await fetch(
                `https://${LB_HOST}/api/letterboxd/search?input=${encodeURIComponent(username)}`,
                { headers: HEADERS }
            );
            if (!memberRes.ok) throw new Error('Letterboxd member search error ' + memberRes.status);
            const mData = await memberRes.json();

            const searchItems = Array.isArray(mData.results) ? mData.results
                : Array.isArray(mData.items) ? mData.items
                : Array.isArray(mData) ? mData : [];

            const memberItem = searchItems
                .filter(el => el.type === 'MemberSearchResult' || el.member)
                .map(el => el.member || el)
                .find(el => (el.username || el.userName || '').toLowerCase() === username.toLowerCase());

            if (!memberItem) throw new Error('Letterboxd member not found: ' + username);
            const memberId = memberItem.id || memberItem.memberId;
            if (!memberId) throw new Error('Member ID not found for: ' + username);
            memberData = { memberId };
            await cache.set(memberKey, memberData);
        }

        const { memberId } = memberData;

        // Step 2: fetch full paginated watchlist (cached)
        const watchlistKey = `lb:watchlist:${memberId}`;
        let filmSlugs = await cache.get(watchlistKey);
        if (!filmSlugs) {
            filmSlugs = [];
            const baseUrl = `https://${LB_HOST}/api/letterboxd/member/${encodeURIComponent(memberId)}/watchlist`;
            let cursor = null;
            let page = 1;
            const MAX_PAGES = 50; // safety cap

            for (let i = 0; i < MAX_PAGES; i++) {
                const url = new URL(baseUrl);
                if (cursor) url.searchParams.set('cursor', cursor);
                else if (page > 1) url.searchParams.set('page', page);

                const wlRes = await fetch(url.toString(), { headers: HEADERS });
                if (!wlRes.ok) throw new Error('Letterboxd watchlist error ' + wlRes.status);
                const wlData = await wlRes.json();

                const entries = Array.isArray(wlData.entries) ? wlData.entries
                    : Array.isArray(wlData.items) ? wlData.items
                    : Array.isArray(wlData.films) ? wlData.films
                    : Array.isArray(wlData) ? wlData : [];

                const pageSlugs = entries.map(el => {
                    const film = el.film || el;
                    return film.id || film.slug;
                }).filter(Boolean);

                filmSlugs.push(...pageSlugs);

                // Determine if there is a next page
                const nextCursor = wlData.next || wlData.cursor?.next || wlData.nextCursor || null;
                const totalPages = wlData.totalPages || wlData.pages || null;

                if (nextCursor) {
                    cursor = nextCursor;
                } else if (totalPages && page < totalPages) {
                    page++;
                } else {
                    break; // no more pages
                }
            }

            await cache.set(watchlistKey, filmSlugs);
        }

        res.json({ inWatchlist: filmSlugs.includes(filmSlug) });
    } catch (err) {
        next(err);
    }
});


module.exports = router;
