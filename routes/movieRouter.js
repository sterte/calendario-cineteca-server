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
    
    const title = parsed.getElementsByClassName('pagetitle minisito').length > 0 ? parsed.getElementsByClassName('pagetitle minisito')[0].innerHTML : '';    
    const extra = parsed.getElementsByClassName('proiezione_corpo');
    const paragraphs = extra.length > 0 ? extra[0].getElementsByTagName('p') : [];

    var image = parsed.getElementsByClassName('mainthumbwrapper');
    if(image.length){
        if(image[0].getElementsByTagName('img').length){
            image = image[0].getElementsByTagName('img');
            if(image.length){
                image = image[0].getAttribute('src').valueOf();
                image = cinetecaUrl + image.substr(image.indexOf('/imageserver'));
            }
            else{
                image ='';
            }
        }
    }
    else{
        image =''
    }

    var durata = paragraphs.length > 0 ? paragraphs[0].innerHTML : '';
    /*
    if(durata.length){        
        const to = durata.indexOf('<br>');
        if(to > -1){
            durata = durata.substr(0, to);    
        }        
        durata = durata.replace(/<[^>]*>/g, '');        
    }*/
    durata = '<p>'+durata+'</p>';

    var sinossi = '';
    if(paragraphs[0].getElementsByTagName('span').length > 0){
        sinossi = paragraphs[0].getElementsByTagName('span')[0].innerHTML;                
        sinossi = '<p>' + sinossi + '</p><p>' + paragraphs[0].innerHTML.substr(paragraphs[0].innerHTML.indexOf('</span>')) + '</p>';
        sinossi = sinossi + '<p>' + paragraphs[1].innerHTML + '</p>';        
    }
    else{
        sinossi = paragraphs.length > 1 ? paragraphs[1].innerHTML : '';                        
    }
    sinossi = paragraphs.length > 2 ? sinossi + '<p>' + paragraphs[2].innerHTML + '</p>': sinossi;            

    const costi = parsed.getElementsByClassName('costi')[0].innerHTML.replace(/<a .*<\/a>/g, '').replace('h2', 'h5');    

    const pagRepliche = parsed.getElementsByClassName('dettagli_cal extra');    
    var i;    
    var days = [];
    for(i=0; i<pagRepliche.length; i++){        
        const giorniRepliche = pagRepliche[i].getElementsByClassName('repliche');        
        var j;
        for(j=0; j<giorniRepliche.length; j++){
            const giornoRepliche = giorniRepliche[j];
            const giorno = giornoRepliche.getElementsByClassName('data_repliche');                        
            if(giorno.length > 0){
                const giornoString = giorno[0].innerHTML
                const orari = giornoRepliche.getElementsByClassName('ora_wrapper').length > 0 ? giornoRepliche.getElementsByClassName('ora_wrapper')[0].getElementsByClassName('ora_repliche') : [];
                var ora = [];
                var k;
                for(k=0; k<orari.length; k++){
                    ora.push(orari[k].innerHTML);
                }
                days.push({day: giornoString, hours: ora});                
            }            
        }   
    }    
    movie = {title: title, duration: durata, summary: sinossi, image: image, hours: days, prices: costi, originalUrl: originalUrl};        
    return movie;
}



movieRouter.route('/:movieId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url= cinetecaUrl + '/vedere/programmazione/' + req.params.movieId;    
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