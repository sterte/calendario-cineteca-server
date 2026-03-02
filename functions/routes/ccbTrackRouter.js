const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');

const ccbUrl = 'https://www.circuitocinemabologna.it';

const ccbTrackRouter = express.Router();
ccbTrackRouter.use(bodyParser.json());

// List page: /eventi/
// Each rassegna card is an <a class="flex-module two-col"> linking to /evento/[slug]/
// Title: h2.item-title, date: p.item-subtitle, description: p.item-desc, image: first img
const parseCcbTracksList = (html) => {
    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');
        const tracks = [];

        const allLinks = parsed.getElementsByTagName('a');
        for (let i = 0; i < allLinks.length; i++) {
            const a = allLinks[i];
            const href = a.getAttribute('href') || '';
            if (!href.includes('/evento/')) continue;

            // Must have an item-title element (actual event card, not a plain text link)
            const titleEls = a.getElementsByClassName('item-title');
            if (!titleEls.length) continue;

            const track = {};
            track.title = titleEls[0].textContent.trim();
            track.link = href;
            track.id = href.replace(/\/$/, '').split('/').pop();

            const imgs = a.getElementsByTagName('img');
            track.image = imgs.length ? (imgs[0].getAttribute('src') || '') : '';

            const subtitleEls = a.getElementsByClassName('item-subtitle');
            track.dateInfo = subtitleEls.length ? subtitleEls[0].textContent.trim() : '';

            const descEls = a.getElementsByClassName('item-desc');
            track.description = descEls.length ? descEls[0].textContent.trim() : '';

            tracks.push(track);
        }
        return tracks;
    } catch (error) {
        console.log(error);
        return [];
    }
};

// Detail page: /evento/[slug]/
// Title: h2#page-title.item-title
// Description: div.text-editor > div.parag > p
// Films: article.event-film--item
//   image: div.event-item--col-img > a > img (src attr)
//   date: p.film-start
//   title+slug: h2.item-title > a
//   director: p.item-subtitle
//   labels: div.label--info
//   cinema: div.label--sala
//   isVO: data-vos attr on article
const parseCcbTrackDetail = (html) => {
    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');
        const track = {};

        // Title
        const pageTitle = parsed.getElementById('page-title');
        if (pageTitle) {
            track.title = pageTitle.textContent.trim();
        } else {
            const titleEls = parsed.getElementsByClassName('item-title');
            track.title = titleEls.length ? titleEls[0].textContent.trim() : '';
        }

        // Description: paragraphs inside div.text-editor
        let descHtml = '';
        const textEditors = parsed.getElementsByClassName('text-editor');
        if (textEditors.length) {
            const ps = textEditors[0].getElementsByTagName('p');
            const parts = [];
            for (let i = 0; i < ps.length; i++) {
                const text = ps[i].textContent.trim();
                if (text) parts.push('<p>' + text + '</p>');
            }
            descHtml = parts.join('');
        }
        track.description = descHtml;

        // Films: article.event-film--item
        const filmItems = parsed.getElementsByClassName('event-film--item');
        const movies = [];

        for (let i = 0; i < filmItems.length; i++) {
            const article = filmItems[i];
            const isVO = article.getAttribute('data-vos') === 'true' ? 1 : 0;

            // Image: first img inside event-item--col-img
            let image = '';
            const imgCols = article.getElementsByClassName('event-item--col-img');
            if (imgCols.length) {
                const imgs = imgCols[0].getElementsByTagName('img');
                if (imgs.length) image = imgs[0].getAttribute('src') || '';
            }

            // Title and slug: h2.item-title > a
            const titleEls = article.getElementsByClassName('item-title');
            if (!titleEls.length) continue;
            const titleLinks = titleEls[0].getElementsByTagName('a');
            if (!titleLinks.length) continue;
            const title = titleLinks[0].textContent.trim();
            const movieUrl = titleLinks[0].getAttribute('href') || '';
            const slug = movieUrl.replace(/\/$/, '').split('/').pop() || '';

            // Date: p.film-start (e.g. "martedì 03/03/2026")
            const filmStartEls = article.getElementsByClassName('film-start');
            const date = filmStartEls.length ? filmStartEls[0].textContent.trim() : '';

            // Director: p.item-subtitle
            const subtitleEls = article.getElementsByClassName('item-subtitle');
            const director = subtitleEls.length ? subtitleEls[0].textContent.trim() : '';

            // Cinema: div.label--sala
            const cinemaEls = article.getElementsByClassName('label--sala');
            const place = cinemaEls.length ? cinemaEls[0].textContent.trim() : '';

            // Labels: div.label--info
            const labelEls = article.getElementsByClassName('label--info');
            const labels = [];
            for (let j = 0; j < labelEls.length; j++) {
                labels.push(labelEls[j].textContent.trim());
            }
            const extras = (director ? '<p>' + director + '</p>' : '')
                + (labels.length ? '<p>' + labels.join(', ') + '</p>' : '');

            movies.push({
                key: i,
                id: slug,
                categoryId: 'film',
                repeatId: slug,
                title,
                date,
                time: '',
                place,
                image,
                isVO,
                extras,
            });
        }
        track.movies = movies;
        return track;
    } catch (error) {
        console.log(error);
        return { title: '', description: '', movies: [] };
    }
};

ccbTrackRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

ccbTrackRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    return fetch(ccbUrl + '/eventi/')
        .then(r => r.text())
        .then(html => {
            res.json(parseCcbTracksList(html));
        })
        .catch((err) => { console.log(err); next(err); });
})
.post(cors.cors, (req, res) => { res.status(403).end('POST not supported'); })
.put(cors.cors, (req, res) => { res.status(403).end('PUT not supported'); })
.delete(cors.cors, (req, res) => { res.status(403).end('DELETE not supported'); });

ccbTrackRouter.route('/:trackId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    return fetch(ccbUrl + '/evento/' + req.params.trackId + '/')
        .then(r => r.text())
        .then(html => {
            res.json(parseCcbTrackDetail(html));
        })
        .catch((err) => { console.log(err); next(err); });
})
.post(cors.cors, (req, res) => { res.status(403).end('POST not supported'); })
.put(cors.cors, (req, res) => { res.status(403).end('PUT not supported'); })
.delete(cors.cors, (req, res) => { res.status(403).end('DELETE not supported'); });

module.exports = ccbTrackRouter;
