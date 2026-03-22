const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');

const gallieraUrl = 'https://www.cinemateatrogalliera.it';

const italianMonths = {
    'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
    'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
    'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
};
const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
const weekDaysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

const { decodeEntities } = require('../parseUtils');

// "22 marzo" → "YYYY-MM-DD" — prefers current year; uses next year only if date is
// more than 14 days in the past.
const parseItalianDate = (text) => {
    const match = text.match(/(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)/i);
    if (!match) return null;
    const dayNum = parseInt(match[1]);
    const monthIdx = italianMonths[match[2].toLowerCase()];
    const now = new Date();
    const currentYear = now.getFullYear();
    const candidate = new Date(currentYear, monthIdx, dayNum);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const year = candidate >= fourteenDaysAgo ? currentYear : currentYear + 1;
    const pad = n => String(n).padStart(2, '0');
    return `${year}-${pad(monthIdx + 1)}-${pad(dayNum)}`;
};

// "2026-03-22" → "Dom 22 Mar 26"
const isoToClientDate = (isoDate) => {
    const d = new Date(isoDate + 'T12:00:00');
    return `${weekDaysShort[d.getDay()]} ${d.getDate()} ${monthNamesShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

// Homepage cache: all day requests hit the same URL so we deduplicate at the promise
// level — concurrent misses share one in-flight fetch instead of each firing their own.
let cachedHtml = null;
let cacheTime = 0;
let fetchPromise = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

const getHomepage = () => {
    const now = Date.now();
    if (cachedHtml && (now - cacheTime < CACHE_TTL)) return Promise.resolve(cachedHtml);
    if (fetchPromise) return fetchPromise;
    fetchPromise = fetch(gallieraUrl)
        .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(html => {
            cachedHtml = html;
            cacheTime = Date.now();
            fetchPromise = null;
            return html;
        })
        .catch(err => { fetchPromise = null; throw err; });
    return fetchPromise;
};

const parseGalliereHomepage = (html, day) => {
    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');

        // Build slug → image map from every linked image on the page
        const imageMap = {};
        const allLinks = parsed.getElementsByTagName('a');
        for (let i = 0; i < allLinks.length; i++) {
            const href = (allLinks[i].getAttribute('href') || '').replace(/\/$/, '');
            if (!href.startsWith(gallieraUrl)) continue;
            const slug = href.split('/').pop();
            if (!slug || imageMap[slug]) continue;
            const imgs = allLinks[i].getElementsByTagName('img');
            if (imgs.length) imageMap[slug] = imgs[0].getAttribute('src') || '';
        }

        const contentEls = parsed.getElementsByClassName('entry-content');
        if (!contentEls.length) return [{ day, movies: [] }];

        // Flatten the content into lines by splitting on <br>
        const rawContent = contentEls[0].innerHTML
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/&nbsp;/g, ' ');

        const lines = rawContent.split('\n');

        let currentDateStr = null;
        const movies = [];
        let key = 0;

        for (const line of lines) {
            const plain = line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

            // Date line: contains a bullet + an Italian month name
            const hasMonth = /gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre/i.test(plain);
            if (hasMonth && (plain.includes('●') || plain.includes('•'))) {
                currentDateStr = parseItalianDate(plain);
                continue;
            }

            // Screening line: "ore HH:MM" + a movie link
            if (!currentDateStr || currentDateStr !== day) continue;
            const timeMatch = plain.match(/ore\s+(\d{1,2})[.:](\d{2})/i);
            if (!timeMatch) continue;
            const linkMatch = line.match(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/i);
            if (!linkMatch) continue;

            const movieUrl = linkMatch[1].replace(/\/$/, '');
            const title = decodeEntities(linkMatch[2].trim());
            const slug = movieUrl.split('/').pop() || '';
            const time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
            const isVO = /V\.O\.S/i.test(plain) ? 1 : 0;

            // Extras: any subtitle/tagline after the link, stripped of time and VO marker
            const rawAfterLink = decodeEntities(
                line
                    .replace(/<a[^>]+>[^<]+<\/a>/gi, '')
                    .replace(/<[^>]+>/g, ' ')
            );
            const afterLink = rawAfterLink
                .replace(/ore\s+\d+[.:]\d+/gi, '')
                .replace(/V\.O\.S\.?\*?/gi, '')
                .replace(/\s+/g, ' ')
                .trim()
                .replace(/^[–—\-\.\|\*\s]+/, '')
                .trim();
            const extras = afterLink ? `<p>${afterLink}</p>` : '';

            movies.push({
                key: key++,
                id: slug,
                categoryId: 'film',
                repeatId: `${slug}-${time.replace(':', '')}`,
                title,
                place: 'Cinema Teatro Galliera',
                date: isoToClientDate(day),
                time,
                url: `${movieUrl}/`,
                image: imageMap[slug] || '',
                isVO,
                isMUSIC: false,
                extras,
                durata: '',
                buyLink: ''
            });
        }

        return [{ day, movies }];
    } catch (error) {
        console.log(error);
        return [{ day, movies: [] }];
    }
};

const gallieraDayRouter = express.Router();
gallieraDayRouter.use(bodyParser.json());

gallieraDayRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

gallieraDayRouter.route('/:day')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    return getHomepage()
        .then(html => {
            res.json(parseGalliereHomepage(html, req.params.day));
        })
        .catch((err) => { console.log(err); next(err); });
})
.post(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported for /galliera-day');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /galliera-day');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('DELETE operation not supported for /galliera-day');
});

module.exports = gallieraDayRouter;
