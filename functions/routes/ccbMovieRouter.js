const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');

const ccbUrl = 'https://www.circuitocinemabologna.it';
const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const weekDayMap = {
    'lunedi': 'Lunedì', 'lunedì': 'Lunedì',
    'martedi': 'Martedì', 'martedì': 'Martedì',
    'mercoledi': 'Mercoledì', 'mercoledì': 'Mercoledì',
    'giovedi': 'Giovedì', 'giovedì': 'Giovedì',
    'venerdi': 'Venerdì', 'venerdì': 'Venerdì',
    'sabato': 'Sabato',
    'domenica': 'Domenica'
};

const { decodeEntities } = require('../parseUtils');

const ccbMovieRouter = express.Router();
ccbMovieRouter.use(bodyParser.json());

// Convert "giovedì 26/02/2026" (may contain HTML entities) → "Giovedì 26 Feb 26"
const formatCcbDate = (italianDate) => {
    const parts = decodeEntities(italianDate.trim()).split(/\s+/);
    if (parts.length < 2) return italianDate;
    const dayName = weekDayMap[parts[0].toLowerCase()] || parts[0];
    const dateParts = parts[1].split('/');
    if (dateParts.length < 3) return italianDate;
    const dayNum = dateParts[0];
    const monthIdx = parseInt(dateParts[1], 10) - 1;
    const yearShort = dateParts[2].substring(2);
    return `${dayName} ${dayNum} ${monthNamesShort[monthIdx]} ${yearShort}`;
};

const parseCcbMovieDetail = (html, movieSlug) => {
    try {
        const originalUrl = `${ccbUrl}/film/${movieSlug}/`;
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');

        // Title
        const titleEls = parsed.getElementsByClassName('title-big');
        const title = titleEls.length > 0 ? titleEls[0].textContent.trim() : '';

        // Hero image (wp-post-image class)
        const heroImgs = parsed.getElementsByClassName('wp-post-image');
        const image = heroImgs.length > 0 ? heroImgs[0].getAttribute('src') || '' : '';

        // Synopsis
        const synopsisEls = parsed.getElementsByClassName('one-col-text');
        const summary = synopsisEls.length > 0 ? synopsisEls[0].innerHTML.trim() : '';

        // Duration from info-box--item containing "Durata:"
        let durationValue = '';
        const infoItems = parsed.getElementsByClassName('info-box--item');
        for (let i = 0; i < infoItems.length; i++) {
            if (infoItems[i].innerHTML.includes('Durata:')) {
                const spans = infoItems[i].getElementsByTagName('span');
                // spans[0] = label "Durata: ", spans[1] = value
                if (spans.length > 1) {
                    durationValue = spans[1].textContent.trim();
                }
                break;
            }
        }

        // Original title from og:title: "Italian Title (original title) - v. o. - Circuito Cinema Bologna"
        const ogTitleMatch = html.match(/property="og:title" content="([^"]+)"/);
        const ogTitle = ogTitleMatch ? ogTitleMatch[1] : '';
        const parenMatch = ogTitle.match(/\(([^)]+)\)/);
        let originalTitle = parenMatch ? parenMatch[1] : '';
        // Capitalize words of original title
        originalTitle = originalTitle.replace(/\b\w/g, c => c.toUpperCase());

        // Year from ticket URL pattern "_YYYY-" (best-effort)
        const yearMatch = html.match(/_(\d{4})-/);
        const year = yearMatch ? yearMatch[1] : '';

        // Country (Paese) from info-box
        let country = '';
        for (let i = 0; i < infoItems.length; i++) {
            if (infoItems[i].innerHTML.includes('Paese:')) {
                const spans = infoItems[i].getElementsByTagName('span');
                if (spans.length > 1) country = spans[1].textContent.trim();
                break;
            }
        }

        // Director from .item-subtitle: "di Nome Cognome"
        let director = '';
        const subtitleEls = parsed.getElementsByClassName('item-subtitle');
        if (subtitleEls.length > 0) {
            const raw = subtitleEls[0].textContent.trim();
            director = raw.replace(/^di\s+/i, '').trim();
        }

        // Duration as number (e.g. "93 min" → 93)
        const durationMinutes = durationValue ? parseInt(durationValue) || 0 : 0;

        // isVO from og:title containing "v. o."
        const filmIsVO = ogTitle.toLowerCase().includes('v. o.');

        // Build duration string that client can parse for IMDB lookup:
        // format: "<span>Original Title</span> (Country/Year) Duration"
        // client extracts: span.textContent for title, between '/' and ')' for year
        const countryYear = country && year ? `${country}/${year}`
            : country ? country
            : year ? `/${year}`
            : '';
        const durationFormatted = `<span>${originalTitle || title}</span>${countryYear ? ' (' + countryYear + ')' : ''} ${durationValue}`.trim();

        // Buy link (first button-cta with an http href)
        const buyLinkEls = parsed.getElementsByClassName('button-cta');
        let buyLink = '';
        for (let i = 0; i < buyLinkEls.length; i++) {
            const href = buyLinkEls[i].getAttribute('href');
            if (href && href.startsWith('http')) {
                buyLink = href;
                break;
            }
        }

        // Projections from article.film-correlati--item
        const projArticles = parsed.getElementsByClassName('film-correlati--item');
        const groupsByDayPlace = new Map();

        for (let i = 0; i < projArticles.length; i++) {
            const art = projArticles[i];

            // Time and cinema from label--sala elements (first=time, second=cinema)
            const salaLabels = art.getElementsByClassName('label--sala');
            const time = salaLabels.length > 0 ? salaLabels[0].textContent.trim() : '';
            const cinema = salaLabels.length > 1 ? salaLabels[1].textContent.trim() : '';

            // Date from h4.date-title: "giovedì 26/02/2026"
            const dateEls = art.getElementsByClassName('date-title');
            const italianDate = dateEls.length > 0 ? dateEls[0].textContent.trim() : '';
            const dateStr = formatCcbDate(italianDate);

            if (!time || !dateStr) continue;

            const groupKey = `${dateStr}|||${cinema}`;
            if (!groupsByDayPlace.has(groupKey)) {
                groupsByDayPlace.set(groupKey, { place: cinema, day: dateStr, hours: [] });
            }
            groupsByDayPlace.get(groupKey).hours.push({
                orario: time,
                isVO: filmIsVO ? 1 : 0,
                additionalInfo: ''
            });
        }

        const allGroups = [...groupsByDayPlace.values()];
        const currentHour = allGroups.length > 0 ? allGroups[0] : { place: '', day: '', hours: [] };
        const hours = allGroups.slice(1);

        return {
            title,
            duration: durationFormatted,
            originalTitle,
            country,
            year,
            director,
            durationMinutes,
            summary,
            image,
            currentHour,
            hours,
            originalUrl,
            buyLink
        };
    } catch (error) {
        console.log(error);
        return error;
    }
};

ccbMovieRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

ccbMovieRouter.route('/:movieSlug')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url = `${ccbUrl}/film/${req.params.movieSlug}/`;
    return fetch(url)
        .then(r => r.text())
        .then(html => {
            const details = parseCcbMovieDetail(html, req.params.movieSlug);
            if (details instanceof Error) {
                res.statusCode = 500;
                res.json({ message: details.message });
            } else {
                res.json(details);
            }
        })
        .catch((err) => { console.log(err); next(err); });
})
.post(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported for /ccb-movies');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /ccb-movies');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('DELETE operation not supported for /ccb-movies');
});

module.exports = ccbMovieRouter;
