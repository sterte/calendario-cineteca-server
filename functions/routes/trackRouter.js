const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const parseUtils = require('../parseUtils')
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const trackRouter = express.Router();
trackRouter.use(bodyParser.json());


const parseTracksList = (html, originalUrl) => {
    try {
        const tracks = [];
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');

        const articles = parsed.getElementsByClassName('c-posts-stream')[0].getElementsByTagName('article');
        for (let i = 0; i < articles.length; i++) {
            const article = articles[i];
            const track = {};
            track.title = article.getElementsByClassName('c-loop-exhibition__title')[0].innerHTML;
            track.dateInfo = article.getElementsByClassName('c-loop-exhibition__label').length > 0 ? article.getElementsByClassName('c-loop-exhibition__label')[0].innerHTML : '';
            track.description = article.getElementsByClassName('c-loop-exhibition__subtitle').length > 0 ? article.getElementsByClassName('c-loop-exhibition__subtitle')[0].innerHTML : '';
            track.link = article.getElementsByTagName('a')[0].getAttribute('href');
            let id = track.link.slice(0, -1);
            track.id = id.substring(id.lastIndexOf('/') + 1);
            track.image = article.getElementsByTagName('img')[0].getAttribute('src');
            tracks.push(track);
        }
        return tracks;
    } catch (error) {
        console.log(error);
        return [];
    }
}

const parseTrackDetail = (html, originalUrl) => {    
    const track = {};

    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');    

    const title = parsed.getElementsByClassName('c-exhibition-cover__title')[0].innerHTML;
    track.title = title;

    let description = "";
    if(parsed.getElementsByClassName('wp-block-qtheme-text-editor-content-inner').length > 0){
        description = parsed.getElementsByClassName('wp-block-qtheme-text-editor-content-inner')[0].innerHTML;
    } else if(parsed.getElementsByClassName('c-exhibition-cover__subtitle').length > 0){
        description = parsed.getElementsByClassName('c-exhibition-cover__subtitle')[0].innerHTML;
    }

    track.description = description;

    const tmpMovies = [];
    if(parsed.getElementsByClassName('c-archive__items').length > 0){
        const movies = parsed.getElementsByClassName('c-archive__items')[0].getElementsByTagName('article');
        for(let i=0;i<movies.length;i++){
            let movie = movies[i];
            tmpMovies.push(parseUtils.parseMovie(movie, i));        
        }

        track.movies = tmpMovies;
    }
    return track;


}


trackRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })

trackRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url= cinetecaUrl + '/rassegne-di-cineteca';  
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})    
    .then(res => res.text())
    .then((res) => parseUtils.decodeEntities(res))
    .then(html => {
        res.json(parseTracksList(html, url));
    })    
    .catch((err) => {console.log(err); next(err)});
}, (err) => {console.log(err); next(err)})
.post(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /movies');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /movies');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /movies');
})


trackRouter.route('/:trackId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url= cinetecaUrl + '/rassegna/' + req.params.trackId;    
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})    
    .then(res => res.text())
    .then((res) => parseUtils.decodeEntities(res))
    .then(html => {
        const details = parseTrackDetail(html, url);
        if(details.errMess){
            res.statusCode = 500;
            res.statusMessage = error;
        }else{
            res.json(details);
        }        
    })    
    .catch((err) => {console.log(err); next(err)});
}, (err) => {console.log(err); next(err)})
.post(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /movies');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /movies');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /movies');
})


module.exports = trackRouter;