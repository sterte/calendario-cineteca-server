const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const movieRouter = express.Router();
movieRouter.use(bodyParser.json());


const parseMovieDetail = (html, originalUrl) => {    
    var movie = {};    
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');    

    const title = parsed.getElementsByClassName('postTitle').length > 0 ? parsed.getElementsByClassName('postTitle')[0].innerHTML : '';                
    var durata = parsed.getElementsByClassName('infoTitle').length > 0 ? parsed.getElementsByClassName('infoTitle')[0].innerHTML : '';        
    var image = parsed.getElementsByClassName('backgroundCover').length > 0 ? parsed.getElementsByClassName('backgroundCover')[0].getAttribute('style') : '';            
    const from = image.indexOf('url(')+4;
    const to = image.indexOf(')', from);        
    image = image.substr(from, to-from);                

    const buyLink = parsed.getElementsByClassName('buyButtonWrap').length > 0 ?  parsed.getElementsByClassName('buyButtonWrap')[0].getElementsByTagName('a')[0].getAttribute('href') : '';
    const sinossi = parsed.getElementsByClassName('movieDescription')[0].innerHTML;            
    //const costi = parsed.getElementsByClassName('costi')[0].innerHTML.replace(/<a .*<\/a>/g, '').replace('h2', 'h5');    

    var pagRepliche = parsed.getElementsByClassName('sameRepeats');    
    if(pagRepliche.length>0){
        pagRepliche = pagRepliche[0].getElementsByClassName('itemLoop');
        if(pagRepliche.length>0){
            var i;    
            var days = [];
            var hours = [];
            var oldData;
            for(i=0; i<pagRepliche.length; i++){         
                var data = pagRepliche[i].getElementsByClassName('date')[0];
                data = data.getElementsByClassName('dateD')[0].innerHTML + ' ' + data.getElementsByClassName('datej')[0].innerHTML + ' ' + data.getElementsByClassName('dateM')[0].innerHTML + ' ' + data.getElementsByClassName('datey')[0].innerHTML;
                if(data != oldData && oldData != null){
                    days.push({day: data, hours: hours});
                    hours = [];
                }
                const orario = pagRepliche[i].getElementsByClassName('time')[0].innerHTML;
                hours.push(orario);        
                if(i == pagRepliche.length-1){
                    days.push({day: data, hours: hours});
                }
                oldData=data;
            }
        }
    }        
            
    movie = {title: title, duration: durata, summary: sinossi, image: image, hours: days, originalUrl: originalUrl, buyLink: buyLink};        
    return movie;
}



movieRouter.route('/:movieId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url= cinetecaUrl + '/proiezione/' + req.params.movieId;    
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})    
    .then(res => res.text())
    .then(html => res.json(parseMovieDetail(html, url)))    
    .catch((err) => next(err));
})
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


module.exports = movieRouter;