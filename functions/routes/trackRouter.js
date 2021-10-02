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


        const articles = parsed.getElementsByTagName('article');           
        for(let i=0;i<articles.length;i++){
            let track = {};
            let article = articles[i];                        
            if(article.getAttribute('class').includes('itemLoop')){
                var title = article.getElementsByClassName('title')[0].innerHTML;
                track.title = title;
                var dateInfo = article.getElementsByClassName('dateInfo').length > 0 ? article.getElementsByClassName('dateInfo')[0].innerHTML : "";
                track.dateInfo = dateInfo;
                var description = article.getElementsByClassName('description')[0].innerHTML;
                track.description = description;
                var linkNode = article.getElementsByTagName('a')[0];
                var link = linkNode.getAttribute('href');                
                track.link = link;

                var image = linkNode.getAttribute('style');
                if(image == null){
                    image = article.getElementsByClassName('contentWrap')[0].getAttribute('test');
                    track.image = image;

                    var id = article.getElementsByTagName('a')[0].getAttribute('href');
                    to = id.lastIndexOf('/') -1;
                    from = id.lastIndexOf('/', to) + 1;                    
                    id = id.substr(from, to-from+1);       
                    track.id = id;

                }else{                    
                    var from = image.indexOf('url(')+4;
                    var to = image.indexOf(')', from);        
                    image = image.substr(from, to-from);       
                    track.image = image;

                    var id = linkNode.getAttribute('href');
                    to = id.lastIndexOf('/') -1;
                    from = id.lastIndexOf('/', to) + 1;
                    id = id.substr(from, to-from+1);       
                    track.id = id;
                }

                tracks.push(track);                
            }
        }

        console.log(JSON.stringify(tracks))
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


    const sections = parsed.getElementsByTagName('section');
    const titleSection = sections[0];
    const listSection = sections[1];
    const title = titleSection.getElementsByClassName('title')[0].innerHTML;
    track.title = title;
    const description = titleSection.getElementsByTagName('p')[0].innerHTML;
    track.description = description;

    tmpMovies = [];
    const movies = listSection.getElementsByTagName('article');
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
    console.log(url);
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
    console.log(url);
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