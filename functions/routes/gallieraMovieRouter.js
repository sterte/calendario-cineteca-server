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

const isoToClientDate = (isoDate) => {
    const d = new Date(isoDate + 'T12:00:00');
    return `${weekDaysShort[d.getDay()]} ${d.getDate()} ${monthNamesShort[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
};

const { decodeEntities } = require('../parseUtils');

const parseGalliereMovieDetail = (html, movieSlug) => {
    try {
        const originalUrl = `${gallieraUrl}/${movieSlug}/`;
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');

        // Title from h1.entry-title.
        // May be "ITALIAN TITLE – ORIGINAL TITLE" or just "TITLE".
        const titleEls = parsed.getElementsByClassName('entry-title');
        const rawTitle = titleEls.length > 0 ? decodeEntities(titleEls[0].textContent.trim()) : '';
        let title = rawTitle;
        let originalTitle = '';
        const dashIdx = rawTitle.indexOf(' – ');
        if (dashIdx !== -1) {
            title = rawTitle.substring(0, dashIdx).trim();
            originalTitle = rawTitle.substring(dashIdx + 3).trim();
        } else {
            originalTitle = rawTitle;
        }

        const contentEls = parsed.getElementsByClassName('entry-content');
        if (!contentEls.length) throw new Error('No entry-content found');
        const paragraphs = contentEls[0].getElementsByTagName('p');

        // Poster image: first <img> found in any paragraph
        let image = '';
        for (let i = 0; i < paragraphs.length; i++) {
            const imgs = paragraphs[i].getElementsByTagName('img');
            if (imgs.length) {
                const src = imgs[0].getAttribute('src') || '';
                if (src) { image = src; break; }
            }
        }

        // Director, country, year, duration: scan paragraphs for the pattern
        // "di DIRECTOR (COUNTRY | YEAR) ... durata X min."
        // The structure varies: image is in p[0], metadata is typically in p[1].
        let director = '', country = '', year = '', durationMinutes = 0;
        let metaParaIndex = -1;
        for (let i = 0; i < paragraphs.length; i++) {
            const text = paragraphs[i].textContent.replace(/\s+/g, ' ').trim();
            const metaMatch = text.match(/di\s+(.+?)\s*\(([^)]+)\)/);
            if (metaMatch) {
                metaParaIndex = i;
                director = metaMatch[1].trim().replace(/[–\-]\s*$/, '').trim();
                const countryYear = metaMatch[2];
                const pipeIdx = countryYear.indexOf('|');
                if (pipeIdx !== -1) {
                    country = countryYear.substring(0, pipeIdx).trim();
                    year = countryYear.substring(pipeIdx + 1).trim();
                } else {
                    const commaYear = countryYear.match(/^(.+?),\s*(\d{4})\s*$/);
                    if (commaYear) { country = commaYear[1].trim(); year = commaYear[2]; }
                    else country = countryYear.trim();
                }
                const durMatch = text.match(/durata\s+(\d+)\s*min/i);
                if (durMatch) durationMinutes = parseInt(durMatch[1]);
                break;
            }
        }

        // Screenings: scan every paragraph for lines matching "● ... ore HH:MM"
        const screenings = [];
        for (let i = 0; i < paragraphs.length; i++) {
            const pLines = paragraphs[i].innerHTML
                .replace(/<br\s*\/?>/gi, '\n')
                .replace(/&nbsp;/g, ' ')
                .split('\n');

            for (const line of pLines) {
                const plain = line.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                if (!(plain.includes('●') || plain.includes('•'))) continue;

                const timeMatch = plain.match(/ore\s+(\d{1,2})[.:](\d{2})/i);
                if (!timeMatch) continue;

                const dateStr = parseItalianDate(plain);
                if (!dateStr) continue;

                const time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
                const isVO = /V\.O\.S/i.test(plain) ? 1 : 0;

                let additionalInfo = '';
                const guestIdx = plain.indexOf('>>>');
                if (guestIdx !== -1) {
                    additionalInfo = `<em>${plain.substring(guestIdx + 3).trim()}</em>`;
                }

                screenings.push({ dateStr, dateFormatted: isoToClientDate(dateStr), time, isVO, additionalInfo });
            }
        }

        // Sort by date then time, group by date
        screenings.sort((a, b) =>
            a.dateStr !== b.dateStr ? a.dateStr.localeCompare(b.dateStr) : a.time.localeCompare(b.time)
        );

        const groupMap = new Map();
        for (const s of screenings) {
            if (!groupMap.has(s.dateFormatted)) {
                groupMap.set(s.dateFormatted, { place: 'Cinema Teatro Galliera', day: s.dateFormatted, hours: [] });
            }
            groupMap.get(s.dateFormatted).hours.push({
                orario: s.time,
                isVO: s.isVO,
                additionalInfo: s.additionalInfo,
                buyLink: ''
            });
        }

        const allGroups = [...groupMap.values()];
        const currentHour = allGroups.length > 0 ? allGroups[0] : { place: 'Cinema Teatro Galliera', day: '', hours: [] };
        const hours = allGroups.slice(1);

        // Summary: all paragraphs except the first (credits) and scheduling/pricing paragraphs
        const summaryParts = [];
        for (let i = 1; i < paragraphs.length; i++) {
            const pText = paragraphs[i].textContent || '';
            if (/ore\s+\d{1,2}[.:]\d{2}/i.test(pText)) continue; // scheduling
            if (/\d+[,.]?\d*\s*€/.test(pText)) continue;          // pricing
            if (!pText.trim()) continue;
            summaryParts.push(paragraphs[i].innerHTML);
        }
        const summary = summaryParts.join('\n');

        const countryYear = [country, year].filter(Boolean).join('/');
        const durationStr = durationMinutes ? `${durationMinutes}'` : '';
        const duration = [originalTitle || title, countryYear ? `(${countryYear})` : '', durationStr]
            .filter(Boolean).join(' ');

        return {
            title,
            duration,
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
            buyLink: ''
        };
    } catch (error) {
        console.log(error);
        return error;
    }
};

const gallieraMovieRouter = express.Router();
gallieraMovieRouter.use(bodyParser.json());

gallieraMovieRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

gallieraMovieRouter.route('/:movieSlug')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url = `${gallieraUrl}/${req.params.movieSlug}/`;
    return fetch(url)
        .then(r => r.text())
        .then(html => {
            const details = parseGalliereMovieDetail(html, req.params.movieSlug);
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
    res.end('POST operation not supported for /galliera-movies');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /galliera-movies');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('DELETE operation not supported for /galliera-movies');
});

module.exports = gallieraMovieRouter;
