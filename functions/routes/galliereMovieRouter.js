const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
// const DOMParser = require('dom-parser'); // TODO: uncomment when scraping is implemented

// TODO: replace with actual Cinema Teatro Galliera website URL
const galliereUrl = 'https://TODO_GALLIERA_URL';

const galliereMovieRouter = express.Router();
galliereMovieRouter.use(bodyParser.json());

// TODO: implement actual HTML scraping once the website URL and structure are known.
// The function below returns a minimal stub until implemented.
const parseGalliereMovieDetail = (html, movieSlug) => {
    try {
        // TODO: parse html, extract movie detail, return object.
        // Return structure must match what MovieComponent expects:
        // {
        //   title: String,
        //   duration: String,
        //   originalTitle: String,
        //   country: String,
        //   year: String,
        //   director: String,
        //   durationMinutes: Number,
        //   summary: String,        // HTML
        //   image: String,          // poster URL
        //   currentHour: { place: 'Cinema Teatro Galliera', day: String, hours: [{ orario, isVO, additionalInfo }] },
        //   hours: [...],           // remaining screenings, same structure as currentHour
        //   originalUrl: String,    // link to the cinema's page for this film
        //   buyLink: '',            // ALWAYS empty — no online purchase
        // }
        return {
            title: '',
            duration: '',
            originalTitle: '',
            country: '',
            year: '',
            director: '',
            durationMinutes: 0,
            summary: '',
            image: '',
            currentHour: { place: 'Cinema Teatro Galliera', day: '', hours: [] },
            hours: [],
            originalUrl: galliereUrl,
            buyLink: ''
        };
    } catch (error) {
        console.log(error);
        return error;
    }
};

galliereMovieRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

galliereMovieRouter.route('/:movieSlug')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    // TODO: replace stub response with real fetch once galliereUrl is known
    const details = parseGalliereMovieDetail('', req.params.movieSlug);
    if (details instanceof Error) {
        res.statusCode = 500;
        res.json({ message: details.message });
    } else {
        res.json(details);
    }
    // return fetch(`${galliereUrl}/film/${req.params.movieSlug}/`)
    //     .then(r => r.text())
    //     .then(html => {
    //         const details = parseGalliereMovieDetail(html, req.params.movieSlug);
    //         if (details instanceof Error) {
    //             res.statusCode = 500;
    //             res.json({ message: details.message });
    //         } else {
    //             res.json(details);
    //         }
    //     })
    //     .catch((err) => { console.log(err); next(err); });
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

module.exports = galliereMovieRouter;
