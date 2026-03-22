const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
// const DOMParser = require('dom-parser'); // TODO: uncomment when scraping is implemented

// TODO: replace with actual Cinema Teatro Galliera website URL
const galliereUrl = 'https://TODO_GALLIERA_URL';

const gallieraDayRouter = express.Router();
gallieraDayRouter.use(bodyParser.json());

// TODO: implement actual HTML scraping once the website URL and structure are known.
// The function below returns an empty program for every day until implemented.
const parseGallieraDayProgram = (html, day) => {
    try {
        // TODO: parse html, extract screenings, return array of movie objects.
        // Each object should follow this structure (same as other providers):
        // {
        //   key: Number,
        //   id: String,          // movie slug / identifier for the detail endpoint
        //   categoryId: String,
        //   repeatId: String,
        //   title: String,
        //   place: 'Cinema Teatro Galliera',  // single sala, always the same
        //   date: String,        // e.g. "Mar 24 Mar"
        //   time: String,        // "HH:MM"
        //   url: String,
        //   image: String,
        //   isVO: 0 | 1,
        //   isMUSIC: false,
        //   extras: String,      // HTML string
        //   durata: String,
        //   buyLink: '',         // ALWAYS empty — no online purchase
        // }
        return [{ day: day, movies: [] }];
    } catch (error) {
        console.log(error);
        return [{ day: day, movies: [] }];
    }
};

gallieraDayRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

gallieraDayRouter.route('/:day')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    // TODO: replace stub response with real fetch once galliereUrl is known
    res.json(parseGallieraDayProgram('', req.params.day));
    // return fetch(galliereUrl)
    //     .then(r => r.text())
    //     .then(html => {
    //         res.setHeader('Content-Type', 'application/json');
    //         res.statusCode = 200;
    //         res.json(parseGallieraDayProgram(html, req.params.day));
    //     })
    //     .catch((err) => { console.log(err); next(err); });
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
