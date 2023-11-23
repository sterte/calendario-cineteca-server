const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const parseUtils = require('../parseUtils')
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const trackRouter = express.Router();
trackRouter.use(bodyParser.json());


const parseTracksList = (html, originalUrl) => {    
    try{
        var tracks = [];    
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');    


        let mainTrack = parsed.getElementsByClassName('c-editorial-slider-item')[0]
        let track = {}
        track.title = mainTrack.getElementsByClassName('c-editorial-slider-item__title')[0].innerHTML;
        track.dateInfo = '';
        track.description =  mainTrack.getElementsByClassName('c-editorial-slider-item__description')[0].innerHTML;
        track.link = mainTrack.getElementsByTagName('a')[0].getAttribute('href');
        track.image = mainTrack.getElementsByTagName('img')[0].getAttribute('src');
        let id = track.link;
        id = id.slice(0, -1)
        let from = id.lastIndexOf('/') + 1;
        id = id.substring(from);
        track.id = id;
        tracks.push(track);

        const articles = parsed.getElementsByClassName('c-posts-stream')[0].getElementsByTagName('article');           
        for(let i=0;i<articles.length;i++){
            track = {};
            let article = articles[i];     
            var title = article.getElementsByClassName('c-loop-exhibition__title')[0].innerHTML;
            track.title = title;
            var dateInfo = article.getElementsByClassName('c-loop-exhibition__label').length > 0 ? article.getElementsByClassName('c-loop-exhibition__label')[0].innerHTML : "";
            track.dateInfo = dateInfo;
            var description = article.getElementsByClassName('c-loop-exhibition__subtitle').length > 0 ? article.getElementsByClassName('c-loop-exhibition__subtitle')[0].innerHTML : '';
            track.description = description;
            var linkNode = article.getElementsByTagName('a')[0];
            var link = linkNode.getAttribute('href');                
            track.link = link;
            id = track.link;
            id = id.slice(0, -1)
            from = id.lastIndexOf('/') + 1;
            id = id.substring(from);
            track.id = id;
            var image = article.getElementsByTagName('img')[0].getAttribute('src');
            track.image = image;
            tracks.push(track);                
        }
        return tracks;
    }catch(error){
        console.log(error)
        return error;
    }
}

const parseTrackDetail = (html, originalUrl) => {    
    var track = {};

    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');    

    const title = parsed.getElementsByClassName('c-exhibition-cover__title')[0].innerHTML;
    track.title = title;

    var description = "";
    if(parsed.getElementsByClassName('wp-block-qtheme-text-editor-content-inner').length > 0){
        description = parsed.getElementsByClassName('wp-block-qtheme-text-editor-content-inner')[0].innerHTML;
    } else if(parsed.getElementsByClassName('c-single-paragraph__description').length > 0){
        description = parsed.getElementsByClassName('c-single-paragraph__description')[0].innerHTML;
    }

    track.description = description;

    tmpMovies = [];
    const movies = parsed.getElementsByClassName('c-archive__items')[0].getElementsByTagName('article');
    for(let i=0;i<movies.length;i++){
        let movie = movies[i];
        tmpMovies.push(parseUtils.parseMovie(movie, i));        
    }

    track.movies = tmpMovies;
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
    .then((res) => parseUtils.forceCharachtersEncoding(res))
    .then(html => {
        const details = parseTracksList(html, url);
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


trackRouter.route('/:trackId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url= cinetecaUrl + '/rassegna/' + req.params.trackId;    
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})    
    .then(res => res.text())
    .then((res) => parseUtils.forceCharachtersEncoding(res))
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