const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const DOMParser = require('dom-parser');

const ccbUrl = 'https://www.circuitocinemabologna.it';
const weekDaysShort = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

const ccbDayRouter = express.Router();
ccbDayRouter.use(bodyParser.json());

const parseCcbDayProgram = (html, day) => {
    try {
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');
        const articles = parsed.getElementsByClassName('film-list--item');

        let moviesJson = [];
        let key = 0;

        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const image = article.getAttribute('data-image') || '';
            const isVO = article.getAttribute('data-vos') === 'true' ? 1 : 0;

            // Parse projections JSON embedded in span.item-projections
            const projSpan = article.getElementsByClassName('item-projections');
            if (!projSpan.length) continue;
            let projections;
            try {
                projections = JSON.parse(projSpan[0].innerHTML.trim());
            } catch (e) {
                continue;
            }
            if (!Array.isArray(projections)) continue;

            // Title and movie URL from h3.title-medium.item-title a
            const titleContainer = article.getElementsByClassName('item-title');
            if (!titleContainer.length) continue;
            const titleLinks = titleContainer[0].getElementsByTagName('a');
            if (!titleLinks.length) continue;
            const title = titleLinks[0].textContent.trim();
            const movieUrl = titleLinks[0].getAttribute('href') || '';
            // slug is last non-empty path segment
            const slug = movieUrl.replace(/\/$/, '').split('/').pop() || '';

            // Labels (Matinée, Rassegna, v.o.s, etc.)
            const labelEls = article.getElementsByClassName('label--info');
            const labels = [];
            for (let j = 0; j < labelEls.length; j++) {
                labels.push(labelEls[j].textContent.trim());
            }
            const extras = '<p>' + labels.join(', ') + '</p>';

            // Buy link
            const buyLinkEls = article.getElementsByClassName('button-cta');
            let buyLink = '';
            for (let j = 0; j < buyLinkEls.length; j++) {
                const href = buyLinkEls[j].getAttribute('href');
                if (href && href.startsWith('http')) {
                    buyLink = href;
                    break;
                }
            }

            // Filter projections by requested day (YYYY-MM-DD)
            for (let p = 0; p < projections.length; p++) {
                const proj = projections[p];
                if (!proj.start) continue;
                // Compare date portion of ISO string directly (local Italian time is in the string)
                const projDate = proj.start.substring(0, 10);
                if (projDate !== day) continue;

                const timePart = proj.start.substring(11, 16); // "HH:MM"
                const d = new Date(proj.start);
                const weekDay = weekDaysShort[d.getDay()];
                const dayNum = d.getDate();
                const monthShort = monthNamesShort[d.getMonth()];
                const dateStr = `${weekDay} ${dayNum} ${monthShort}`;

                moviesJson.push({
                    key: key++,
                    id: slug,
                    categoryId: 'film',
                    repeatId: proj.projection_public_id || '',
                    title: title,
                    place: proj.cinema_name || '',
                    date: dateStr,
                    time: timePart,
                    url: movieUrl,
                    image: image,
                    isVO: isVO,
                    isMUSIC: false,
                    extras: extras,
                    durata: ''
                });
            }
        }

        return [{ day: day, movies: moviesJson }];
    } catch (error) {
        console.log(error);
        return [{ day: day, movies: [] }];
    }
};

ccbDayRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

ccbDayRouter.route('/:day')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    return fetch(ccbUrl)
        .then(r => r.text())
        .then(html => {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 200;
            res.json(parseCcbDayProgram(html, req.params.day));
        })
        .catch((err) => { console.log(err); next(err); });
})
.post(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported for /ccb-day');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /ccb-day');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('DELETE operation not supported for /ccb-day');
});

module.exports = ccbDayRouter;
