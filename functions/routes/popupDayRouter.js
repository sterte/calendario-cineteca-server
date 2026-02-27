const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');

const popupUrl = 'https://popupcinema.18tickets.it';
const weekDaysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const popupDayRouter = express.Router();
popupDayRouter.use(bodyParser.json());

// Format YYYY-MM-DD → "Sab 28 Feb 26"
const formatDate = (dayStr) => {
    const d = new Date(dayStr + 'T12:00:00');
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

// Unescape a JS string literal from a jQuery .html('...') call
const unescapeJsStr = (s) => s
    .replace(/\\'/g, "'")
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');

// Extract the HTML content from a jQuery $(selector).html('...') or .html("...") call
const extractJqueryHtml = (js, selector) => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reSingle = new RegExp(`\\$\\(["']\\s*${esc}\\s*["']\\)\\.html\\('((?:[^'\\\\]|\\\\.)*)'\\)`);
    const mSingle = js.match(reSingle);
    if (mSingle) return unescapeJsStr(mSingle[1]);
    const reDouble = new RegExp(`\\$\\(["']\\s*${esc}\\s*["']\\)\\.html\\("((?:[^"\\\\]|\\\\.)*)"\\)`);
    const mDouble = js.match(reDouble);
    return mDouble ? unescapeJsStr(mDouble[1]) : '';
};

const parsePopupDayProgram = (jsResponse, day) => {
    try {
        const html = extractJqueryHtml(jsResponse, '#movie-list');
        if (!html) return [{ day, movies: [] }];

        const parser = new DOMParser();
        const parsed = parser.parseFromString(`<div id="root">${html}</div>`, 'text/html');
        const movieEls = parsed.getElementsByClassName('movie--preview');
        const moviesJson = [];
        let key = 0;
        const dateStr = formatDate(day);

        for (let i = 0; i < movieEls.length; i++) {
            const movieEl = movieEls[i];

            // Title and film URL
            const titleLinks = movieEl.getElementsByClassName('movie__title');
            if (!titleLinks.length) continue;
            const title = titleLinks[0].textContent.trim();
            const filmHref = titleLinks[0].getAttribute('href') || '';
            const filmId = extractFilmId(filmHref);
            if (!filmId) continue;
            const filmUrl = `${popupUrl}/film/${filmId}`;

            // Image
            const imgs = movieEl.getElementsByClassName('img-thumbnail');
            const image = imgs.length ? (imgs[0].getAttribute('src') || '') : '';

            // isVO and extras from film-label elements
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

            // Screenings from .schedule-section-show
            const scheduleEls = movieEl.getElementsByClassName('schedule-section-show');
            for (let s = 0; s < scheduleEls.length; s++) {
                const schedEl = scheduleEls[s];

                // Cinema name from .time-select__place (last non-date text line)
                const placeEls = schedEl.getElementsByClassName('time-select__place');
                let cinemaName = '';
                if (placeEls.length) {
                    const parts = placeEls[0].textContent.split('\n').map(p => p.trim()).filter(Boolean);
                    const nonDate = parts.filter(p => !p.match(/^\d+\/\d+\/\d+$/) && !p.match(/\d{2}\/\d{2}\/\d{4}/));
                    cinemaName = nonDate[nonDate.length - 1] || parts[parts.length - 1] || '';
                }

                // Time slots from a[data-time]
                const allLinks = schedEl.getElementsByTagName('a');
                for (let t = 0; t < allLinks.length; t++) {
                    const link = allLinks[t];
                    if (!link.getAttribute('data-time')) continue;
                    const buyHref = link.getAttribute('href') || '';
                    const uuid = extractUuid(buyHref);
                    const li = link.getElementsByTagName('li')[0];
                    if (!li) continue;
                    const timeMatch = li.textContent.match(/(\d{1,2}:\d{2})/);
                    if (!timeMatch) continue;

                    moviesJson.push({
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

        moviesJson.sort((a, b) => {
            const [ah, am] = a.time.split(':').map(Number);
            const [bh, bm] = b.time.split(':').map(Number);
            return (ah * 60 + am) - (bh * 60 + bm);
        });
        return [{ day, movies: moviesJson }];
    } catch (error) {
        console.log('popupDayRouter parse error:', error);
        return [{ day, movies: [] }];
    }
};

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SESSION_TTL = 4 * 60 * 1000; // 4 minutes

// Shared session cache — all concurrent requests wait on the same promise
let sessionPromise = null;
let sessionExpiry = 0;

const fetchSession = () => {
    const now = Date.now();
    if (sessionPromise && now < sessionExpiry) return sessionPromise;
    sessionExpiry = now + SESSION_TTL;
    sessionPromise = fetch(popupUrl, { headers: { 'User-Agent': UA } })
        .then(async r => {
            const setCookies = typeof r.headers.getSetCookie === 'function'
                ? r.headers.getSetCookie()
                : (r.headers.get('set-cookie') || '').split(/,(?=\s*[\w-]+=)/);
            const cookie = setCookies.map(c => c.split(';')[0].trim()).join('; ');
            const html = await r.text();
            const m = html.match(/name="csrf-token"\s+content="([^"]+)"/);
            return { csrf: m ? m[1] : '', cookie };
        })
        .catch(err => {
            sessionPromise = null; // allow retry on error
            throw err;
        });
    return sessionPromise;
};

const fetchDay = async (day) => {
    const { csrf, cookie } = await fetchSession();
    const apiRes = await fetch(`${popupUrl}/film/fetch_films?date=${day}`, {
        headers: {
            'User-Agent': UA,
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': csrf,
            'Accept': 'text/javascript, application/javascript',
            'Referer': popupUrl + '/',
            'Cookie': cookie
        }
    });
    if (apiRes.status === 422) {
        // CSRF rejected — invalidate cache and retry once with a fresh session
        console.log(`popupDayRouter: 422 for ${day}, refreshing session`);
        sessionPromise = null;
        sessionExpiry = 0;
        const s2 = await fetchSession();
        const retry = await fetch(`${popupUrl}/film/fetch_films?date=${day}`, {
            headers: {
                'User-Agent': UA,
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': s2.csrf,
                'Accept': 'text/javascript, application/javascript',
                'Referer': popupUrl + '/',
                'Cookie': s2.cookie
            }
        });
        return retry.text();
    }
    return apiRes.text();
};

popupDayRouter.route('*')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

popupDayRouter.route('/:day')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, async (req, res, next) => {
        try {
            const jsResponse = await fetchDay(req.params.day);
            res.json(parsePopupDayProgram(jsResponse, req.params.day));
        } catch (err) {
            console.log('popupDayRouter GET error:', err);
            next(err);
        }
    })
    .post(cors.cors, (req, res) => { res.statusCode = 403; res.end('POST not supported for /popup-day'); })
    .put(cors.cors, (req, res) => { res.statusCode = 403; res.end('PUT not supported for /popup-day'); })
    .delete(cors.cors, (req, res) => { res.statusCode = 403; res.end('DELETE not supported for /popup-day'); });

module.exports = popupDayRouter;
