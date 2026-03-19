const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');
const { decodeEntities } = require('../parseUtils');

const popupUrl = 'https://popupcinema.18tickets.it';
const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const italianWeekDays = {
    'lunedì': 'Lun', 'lunedi': 'Lun',
    'martedì': 'Mar', 'martedi': 'Mar',
    'mercoledì': 'Mer', 'mercoledi': 'Mer',
    'giovedì': 'Gio', 'giovedi': 'Gio',
    'venerdì': 'Ven', 'venerdi': 'Ven',
    'sabato': 'Sab',
    'domenica': 'Dom'
};

const popupMovieRouter = express.Router();
popupMovieRouter.use(bodyParser.json());

// "Sabato 28/02/2026" → "Sab 28 Feb 26"
const formatItalianDate = (italianDate) => {
    const parts = italianDate.trim().split(/\s+/);
    if (parts.length < 2) return italianDate;
    const dayName = italianWeekDays[parts[0].toLowerCase()] || parts[0].substring(0, 3);
    const dateParts = parts[1].split('/');
    if (dateParts.length < 3) return italianDate;
    const dayNum = parseInt(dateParts[0], 10);
    const monthIdx = parseInt(dateParts[1], 10) - 1;
    const yearShort = dateParts[2].slice(2);
    return `${dayName} ${dayNum} ${monthNamesShort[monthIdx]} ${yearShort}`;
};

// Unescape a JS string literal
const unescapeJsStr = (s) => s
    .replace(/\\'/g, "'")
    .replace(/\\\//g, '/')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"');

// Extract HTML from $(selector).html('...') or .html("...") in a JS response
const extractJqueryHtml = (js, selector) => {
    const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const reSingle = new RegExp(`\\$\\(["']\\s*${esc}\\s*["']\\)\\.html\\('((?:[^'\\\\]|\\\\.)*)'\\)`);
    const mSingle = js.match(reSingle);
    if (mSingle) return unescapeJsStr(mSingle[1]);
    const reDouble = new RegExp(`\\$\\(["']\\s*${esc}\\s*["']\\)\\.html\\("((?:[^"\\\\]|\\\\.)*)"\\)`);
    const mDouble = js.match(reDouble);
    return mDouble ? unescapeJsStr(mDouble[1]) : '';
};

// Parse a film-projection element to extract { orario, isVO, buyLink, place, day }
const parseProjections = (html, filmId, filmIsVO) => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<div>${html}</div>`, 'text/html');
    const projEls = parsed.getElementsByClassName('film-projection');
    const groups = new Map();

    for (let i = 0; i < projEls.length; i++) {
        const proj = projEls[i];
        const dateExtended = proj.getAttribute('data-date-extended') || '';
        // "Sabato 28/02/2026 ore 17:30" or "Mercoledì 04/03/2026 ore 19:30" (accented chars)
        const dtMatch = dateExtended.match(/(\S+\s+\d+\/\d+\/\d+)\s+ore\s+(\d{1,2}:\d{2})/);
        if (!dtMatch) continue;

        const dateStr = formatItalianDate(dtMatch[1]);
        const time = dtMatch[2];
        const dataId = proj.getAttribute('data-id') || '';
        const tname = proj.getAttribute('data-tname') || '';
        const theaterName = proj.getAttribute('data-theater-name') || tname.toUpperCase();

        // Capitalize cinema name: "arlecchino" → "Arlecchino"
        const cinemaShort = theaterName.charAt(0).toUpperCase() + theaterName.slice(1).toLowerCase();
        const cinemaFull = `Pop Up Cinema ${cinemaShort}`;
        const buyLink = dataId && tname
            ? `https://${tname}.popupcinema.18tickets.it/film/${filmId}/${dataId}#theater-init`
            : '';

        const groupKey = `${dateStr}|||${cinemaFull}`;
        if (!groups.has(groupKey)) {
            groups.set(groupKey, { place: cinemaFull, day: dateStr, hours: [] });
        }
        groups.get(groupKey).hours.push({
            orario: time,
            isVO: filmIsVO ? 1 : 0,
            additionalInfo: '',
            buyLink
        });
    }

    return [...groups.values()];
};

// Get the movie__option text for a given label (e.g., "Regia:", "Anno:")
const getMovieOption = (parsed, labelText) => {
    const opts = parsed.getElementsByClassName('movie__option');
    for (let i = 0; i < opts.length; i++) {
        if (opts[i].innerHTML && opts[i].innerHTML.includes(labelText)) {
            return decodeEntities(opts[i].textContent.replace(labelText, '').trim());
        }
    }
    return '';
};

const parsePopupMovieDetail = async (html, movieId, csrf, cookie) => {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');

    // Title: h5.page-heading (strip " - ORIGINAL VERSION" suffix)
    const headings = parsed.getElementsByClassName('page-heading');
    let rawTitle = headings.length ? decodeEntities(headings[0].textContent.trim()) : '';
    const isVO = /original version/i.test(rawTitle) || getMovieOption(parsed, 'Lingua:').toLowerCase().includes('originale');
    const title = rawTitle.replace(/\s*-\s*ORIGINAL VERSION\s*$/i, '').trim();

    // Original title: from "(ORIGINAL TITLE)" in title, or title itself — always title-cased
    const toTitleCase = s => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const parenMatch = title.match(/^.+\(([^)]+)\)\s*$/);
    const originalTitle = parenMatch ? toTitleCase(parenMatch[1]) : toTitleCase(title);

    // Image: img.img-thumbnail in .movie__images
    const movieImages = parsed.getElementsByClassName('movie__images');
    let image = '';
    if (movieImages.length) {
        const imgs = movieImages[0].getElementsByClassName('img-thumbnail');
        if (imgs.length) image = imgs[0].getAttribute('src') || '';
    }

    // Duration: p.movie__time → "Durata: 103 min" → "103 min"
    const movieTimes = parsed.getElementsByClassName('movie__time');
    let durationMin = '';
    for (let i = 0; i < movieTimes.length; i++) {
        const t = movieTimes[i].textContent.trim();
        const m = t.match(/(\d+\s*min)/i);
        if (m) { durationMin = m[1]; break; }
    }

    // Year, director and other metadata
    const year = getMovieOption(parsed, 'Anno:');
    const director = getMovieOption(parsed, 'Regia:');
    const durationMinutes = durationMin ? parseInt(durationMin) || 0 : 0;

    // Plot: find div with id='plotPanel' then .card-body
    let summary = '';
    const allDivs = parsed.getElementsByTagName('div');
    for (let i = 0; i < allDivs.length; i++) {
        if (allDivs[i].getAttribute('id') === 'plotPanel') {
            const bodies = allDivs[i].getElementsByClassName('card-body');
            if (bodies.length) summary = bodies[0].innerHTML.trim();
            break;
        }
    }

    // Duration string for IMDB lookup: "<span>Original Title</span> (/Year) Xmin"
    const duration = `<span>${originalTitle}</span>${year ? ` (/${year})` : ''} ${durationMin}`.trim();

    // All available dates from date balloons
    const dateBalloons = parsed.getElementsByClassName('select-date');
    const dates = [];
    for (let i = 0; i < dateBalloons.length; i++) {
        const dt = dateBalloons[i].getAttribute('data-target');
        if (dt && dt.match(/^\d{4}-\d{2}-\d{2}$/)) dates.push(dt);
    }

    // Fetch screenings for all dates in parallel
    const filmPageUrl = `${popupUrl}/film/${movieId}`;
    const occupationPromises = dates.map(date =>
        fetch(`${filmPageUrl}/fetch_film_occupations?date=${date}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-Token': csrf,
                'Accept': 'text/javascript, application/javascript',
                'Referer': filmPageUrl,
                'Cookie': cookie
            }
        })
        .then(r => r.text())
        .then(js => {
            const innerHtml = extractJqueryHtml(js, '.schedule-section-show');
            return innerHtml ? parseProjections(innerHtml, movieId, isVO) : [];
        })
        .catch(() => [])
    );

    // If no dates, parse from the initial page's #occupations-container
    let allGroups = [];
    if (dates.length === 0) {
        for (let i = 0; i < allDivs.length; i++) {
            if (allDivs[i].getAttribute('id') === 'occupations-container') {
                const schedEls = allDivs[i].getElementsByClassName('schedule-section-show');
                if (schedEls.length) {
                    allGroups = parseProjections(schedEls[0].innerHTML || '', movieId, isVO);
                }
                break;
            }
        }
    } else {
        const results = await Promise.all(occupationPromises);
        // Merge all groups preserving order
        const mergedMap = new Map();
        for (const dateGroups of results) {
            for (const g of dateGroups) {
                const key = `${g.day}|||${g.place}`;
                if (!mergedMap.has(key)) {
                    mergedMap.set(key, g);
                } else {
                    // Append hours (avoid duplicates by time)
                    const existing = mergedMap.get(key);
                    for (const h of g.hours) {
                        if (!existing.hours.find(e => e.orario === h.orario)) {
                            existing.hours.push(h);
                        }
                    }
                }
            }
        }
        allGroups = [...mergedMap.values()];
    }

    const currentHour = allGroups.length > 0 ? allGroups[0] : { place: '', day: '', hours: [] };
    const hours = allGroups.slice(1);

    // Buy link: first future showing's buy link (or empty)
    const buyLink = allGroups.length > 0 && allGroups[0].hours.length > 0
        ? (allGroups[0].hours[0].buyLink || '')
        : '';

    return {
        title,
        duration,
        originalTitle,
        country: '',
        year,
        director,
        durationMinutes,
        summary,
        image,
        currentHour,
        hours,
        originalUrl: filmPageUrl,
        buyLink
    };
};

popupMovieRouter.route('*')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

popupMovieRouter.route('/:movieId')
    .options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
    .get(cors.cors, async (req, res, next) => {
        try {
            const filmUrl = `${popupUrl}/film/${req.params.movieId}`;
            const filmRes = await fetch(filmUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' }
            });
            const setCookies = typeof filmRes.headers.getSetCookie === 'function'
                ? filmRes.headers.getSetCookie()
                : (filmRes.headers.get('set-cookie') || '').split(/,(?=\s*[\w-]+=)/);
            const cookie = setCookies.map(c => c.split(';')[0].trim()).join('; ');
            const html = await filmRes.text();

            const csrfMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
            const csrf = csrfMatch ? csrfMatch[1] : '';

            const details = await parsePopupMovieDetail(html, req.params.movieId, csrf, cookie);
            res.json(details);
        } catch (err) {
            console.log('popupMovieRouter GET error:', err);
            next(err);
        }
    })
    .post(cors.cors, (req, res) => { res.statusCode = 403; res.end('POST not supported for /popup-movies'); })
    .put(cors.cors, (req, res) => { res.statusCode = 403; res.end('PUT not supported for /popup-movies'); })
    .delete(cors.cors, (req, res) => { res.statusCode = 403; res.end('DELETE not supported for /popup-movies'); });

module.exports = popupMovieRouter;
