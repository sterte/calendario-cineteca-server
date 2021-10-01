const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const parseUtils = require('../parseUtils')
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const trackRouter = express.Router();
trackRouter.use(bodyParser.json());


const parseTrackDetail = (html, originalUrl) => {    
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
                var link = article.getElementsByTagName('a')[0].getAttribute('href');                
                track.link = link;
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