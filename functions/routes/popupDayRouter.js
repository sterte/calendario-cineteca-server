const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');
const { decodeEntities } = require('../parseUtils');

const popupUrl = 'https://popupcinema.18tickets.it';
const weekDaysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const popupDayRouter = express.Router();
popupDayRouter.use(bodyParser.json());

// "DD/MM/YYYY" → "YYYY-MM-DD"
const parseDateKey = (ddmmyyyy) => {
    const [d, m, y] = ddmmyyyy.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
};

// "YYYY-MM-DD" → "Sab 28 Feb 26"
const formatDate = (dateKey) => {
    const d = new Date(dateKey + 'T12:00:00');
    return `${weekDaysShort[d.getDay()]} ${d.getDate()} ${monthNamesShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

// Extract film numeric ID from URL: /film/55686
const extractFilmId = (url) => {
    const m = url.match(/\/film\/(\d+)/);
    return m ? m[1] : '';
};

// Extract screening UUID from buy URL: /film/ID/UUID#theater-init
const extractUuid = (url) => {
    const m = url.match(/\/film\/\d+\/([0-9a-f-]{36})(?:#|$)/i);
    return m ? m[1] : '';
};

// Cinema subdomain → full display name
const cinemaNames = {
    'arlecchino': 'Pop Up Cinema Arlecchino',
    'bristol': 'Pop Up Cinema Bristol 2 K',
    'jolly': 'Pop Up Cinema Jolly 4 K',
    'medica': 'Pop Up Cinema Medica 4 K'
};

// Parse the full homepage HTML into a Map<YYYY-MM-DD, movies[]>
const parseAllDays = (html) => {
    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');

        // Find #movie-list
        const allDivs = parsed.getElementsByTagName('div');
        let movieListEl = null;
        for (let i = 0; i < allDivs.length; i++) {
            if (allDivs[i].getAttribute('id') === 'movie-list') {
                movieListEl = allDivs[i];
                break;
            }
        }
        if (!movieListEl) {
            console.log('popupDayRouter: #movie-list not found in homepage');
            return new Map();
        }

        const movieEls = movieListEl.getElementsByClassName('movie--preview');
        const dayMap = new Map(); // YYYY-MM-DD → movies[]
        let key = 0;

        for (let i = 0; i < movieEls.length; i++) {
            const movieEl = movieEls[i];

            // Title and film URL
            const titleLinks = movieEl.getElementsByClassName('movie__title');
            if (!titleLinks.length) continue;
            const title = decodeEntities(titleLinks[0].textContent.trim());
            const filmHref = titleLinks[0].getAttribute('href') || '';
            const filmId = extractFilmId(filmHref);
            if (!filmId) continue;
            const filmUrl = `${popupUrl}/film/${filmId}`;

            // Image
            const imgs = movieEl.getElementsByClassName('img-thumbnail');
            const image = imgs.length ? (imgs[0].getAttribute('src') || '') : '';

            // isVO and extras
            const labelEls = movieEl.getElementsByClassName('film-label');
            let isVO = 0;
            const extraLabels = [];
            for (let j = 0; j < labelEls.length; j++) {
                const lt = labelEls[j].textContent.trim();
                if (!lt) continue;
                extraLabels.push(lt);
                if (lt.toUpperCase().includes('VOS') || lt.toUpperCase().includes('V.O.')) isVO = 1;
            }
            const extras = extraLabels.length ? `<p>${extraLabels.join(', ')}</p>` : '';

            // Each schedule-section-show may contain multiple time-select__place blocks
            // (one per date). Derive the date from the data-time timestamp on each link
            // and cinema name from the buy URL subdomain.
            const scheduleEls = movieEl.getElementsByClassName('schedule-section-show');
            for (let s = 0; s < scheduleEls.length; s++) {
                const schedEl = scheduleEls[s];
                const allLinks = schedEl.getElementsByTagName('a');

                for (let t = 0; t < allLinks.length; t++) {
                    const link = allLinks[t];
                    const dataTime = link.getAttribute('data-time');
                    if (!dataTime) continue;

                    const timestamp = parseInt(dataTime);
                    if (isNaN(timestamp)) continue;

                    // Derive YYYY-MM-DD from timestamp.
                    // Italian cinema screenings start ≥10:00 CET, so UTC date == Italian date.
                    const dateKey = new Date(timestamp).toISOString().slice(0, 10);
                    const dateStr = formatDate(dateKey);

                    // Cinema name from buy URL subdomain
                    const buyHref = link.getAttribute('href') || '';
                    const uuid = extractUuid(buyHref);
                    const cinemaMatch = buyHref.match(/https?:\/\/(\w+)\.popupcinema/);
                    const cinemaSlug = cinemaMatch ? cinemaMatch[1] : '';
                    const cinemaName = cinemaNames[cinemaSlug] || ('Pop Up Cinema ' + cinemaSlug);

                    // Time from the button text
                    const li = link.getElementsByTagName('li')[0];
                    if (!li) continue;
                    const timeMatch = li.textContent.match(/(\d{1,2}:\d{2})/);
                    if (!timeMatch) continue;

                    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
                    dayMap.get(dateKey).push({
                        key: key++,
                        id: filmId,
                        categoryId: 'film',
                        repeatId: uuid,
                        title,
                        place: cinemaName,
                        date: dateStr,
                        time: timeMatch[1],
                        url: filmUrl,
                        image,
                        isVO,
                        isMUSIC: false,
                        extras,
                        durata: ''
                    });
                }
            }
        }

        // Sort each day by time
        for (const movies of dayMap.values()) {
            movies.sort((a, b) => {
                const [ah, am] = a.time.split(':').map(Number);
                const [bh, bm] = b.time.split(':').map(Number);
                return (ah * 60 + am) - (bh * 60 + bm);
            });
        }

        console.log(`popupDayRouter: parsed ${dayMap.size} days, ${key} screenings from homepage`);
        return dayMap;
    } catch (err) {
        console.log('popupDayRouter parse error:', err);
        return new Map();
    }
};

// Cache: one homepage fetch serves all day requests for 10 minutes
let cachePromise = null;
let cacheExpiry = 0;

const getCache = () => {
    const now = Date.now();
    if (cachePromise && now < cacheExpiry) return cachePromise;
    cacheExpiry = now + CACHE_TTL;
    cachePromise = fetch(popupUrl, { headers: { 'User-Agent': UA } })
        .then(r => r.text())
        .then(html => parseAllDays(html))
        .catch(err => {
            cachePromise = null;
            throw err;
        });
    return cachePromise;
};

popupDayRouter.route('*')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

popupDayRouter.route('/:day')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, async (req, res, next) => {
        try {
            let dayMap = await getCache();
            if (!dayMap.has(req.params.day)) {
                // Requested day not in cache — invalidate and re-fetch once
                console.log(`popupDayRouter: ${req.params.day} not in cache, refreshing`);
                cachePromise = null;
                cacheExpiry = 0;
                dayMap = await getCache();
            }
            const movies = dayMap.get(req.params.day) || [];
            res.json([{ day: req.params.day, movies }]);
        } catch (err) {
            console.log('popupDayRouter GET error:', err);
            next(err);
        }
    })
    .post(cors.cors, (req, res) => { res.statusCode = 403; res.end('POST not supported for /popup-day'); })
    .put(cors.cors, (req, res) => { res.statusCode = 403; res.end('PUT not supported for /popup-day'); })
    .delete(cors.cors, (req, res) => { res.statusCode = 403; res.end('DELETE not supported for /popup-day'); });

module.exports = popupDayRouter;
