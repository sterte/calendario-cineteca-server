const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const parseUtils = require('../parseUtils')
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const movieRouter = express.Router();
movieRouter.use(bodyParser.json());

const monthNamesShort = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];


const parseMovieDetail = (html, originalUrl) => {    
    try{
        var movie = {};    
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');    

        const title = parsed.getElementsByClassName('c-show-single-page-title__title').length > 0 ? parsed.getElementsByClassName('c-show-single-page-title__title')[0].innerHTML : '';                
        var durata = parsed.getElementsByClassName('c-show-single-page-title__title-info')[0].innerHTML;
        var image = parsed.getElementsByClassName('c-show-single-gallery')[0].getElementsByTagName('img');
        image = image.length > 0 ? image[0].getAttribute('src') : '';             
        
        var buyLink = parsed.getElementsByClassName('c-button-entry-condition--buy').length > 0 ? parsed.getElementsByClassName('c-button-entry-condition--buy') : '';
        buyLink = buyLink.length > 0 ?  buyLink[0].getAttribute('href') : '';
        
        var sinossi;
        if(parsed.getElementsByClassName('c-loop-show-movie__description').length > 0){
            sinossi = parsed.getElementsByClassName('c-loop-show-movie__description')[0].innerHTML;
        }
        else if(parsed.getElementsByClassName('c-show-single-description__content').length > 0){
            sinossi = parsed.getElementsByClassName('c-show-single-description__content')[0].innerHTML;
        }
        
        else{
            sinossi = '';
        }

        const isVO = parsed.getElementsByClassName('c-show-single-repeat-sidebar__item-title')[0].innerHTML.includes('Originale');        
  

        let extras = parsed.getElementsByClassName('c-show-single-repeat-content__bar-info-item--special-event-info');
        let extrasString = '';
        if(extras.length > 0){
            for(let i=0;i<extras.length;i++){                          
                let extra = extras[i];
                if(i > 0){
                    extrasString = extrasString + '<br>'
                }
                extrasString = extrasString + extra.innerHTML;
            }            
        }

        extras = parsed.getElementsByClassName('c-show-single-repeat-part-of__item-content');
        if(extras.length > 0){
            extrasString = extrasString + 'Rassegna: ' + extras[0].innerHTML.replace('https://cinetecadibologna.it/programmazione/rassegna', '/tracks');
        }
        extrasString = extrasString + '<br>';
        

        var pagRepliche = parsed.getElementsByClassName('c-show-single-next-repeats');            
        var days = [];
        var hours = [];
        var place = "";
        var oldData;
        var currentHour;

        if(parsed.getElementsByClassName('c-show-single-repeat-where-and-when__content').length > 0){
            replica = parsed.getElementsByClassName('c-show-single-repeat-where-and-when__content')[0];
            
            let dataSplitted = parsed.getElementsByClassName('c-show-single-repeat-where-and-when__day')[0].innerHTML.split(' ');
            let dataSplitted2 = dataSplitted[1].split('/');
            const data = dataSplitted[0] + ' ' + dataSplitted2[0] + ' '  + monthNamesShort[dataSplitted2[1]-1] + ' ' + dataSplitted2[2].substring(2)
            const hours = {isVO: isVO, additionalInfo:extrasString, orario: replica.getElementsByClassName('c-show-single-repeat-where-and-when__time')[0].innerHTML};
            
            if(replica.getElementsByClassName('c-show-single-repeat-where-and-when__where').length > 0){
                place = replica.getElementsByClassName('c-show-single-repeat-where-and-when__where')[0].innerHTML;
            }
            currentHour = {place : place, day: data, hours: [hours]};
        } 

        if(pagRepliche.length>0){
            pagRepliche = pagRepliche[0].getElementsByTagName('article');
            if(pagRepliche.length>0){
                var i;                
                for(i=0; i<pagRepliche.length; i++){         
                    var data = pagRepliche[i].getElementsByClassName('c-repeat-loop__date')[0].innerHTML;                    
                    if(data != oldData && oldData != null){
                        days.push({place: oldLuogo, day: oldData, hours: hours});
                        hours = [];
                        place = "";
                    }
                    const orario = pagRepliche[i].getElementsByClassName('c-repeat-loop__time')[0].innerHTML;
                    const luogo = pagRepliche[i].getElementsByClassName('c-repeat-loop__where')[0].innerHTML;
                    const isVO = pagRepliche[i].getElementsByClassName('fa-volume-off').length > 0;    
                    var additionalInfo = "";
                    var additionalInfoNode = pagRepliche[i].getElementsByClassName('c-repeat-loop__label');
                    if(additionalInfoNode.length > 0){
                        if(additionalInfoNode.length > 0){
                            additionalInfo = additionalInfoNode[0].innerHTML;
                        }
                    } 
                    hours.push({orario: orario, isVO: isVO, additionalInfo: additionalInfo});    
                    if(i == pagRepliche.length-1){
                        days.push({place: luogo, day: data, hours: hours});
                    }
                    oldData = data;
                    oldLuogo = luogo;
                }
            }
        }        
                
        movie = {title: title, duration: durata, summary: sinossi, image: image, currentHour: currentHour, hours: days, originalUrl: originalUrl, buyLink: buyLink};        
        return movie;
    }catch(error){
        console.log(error)
        return error;
    }
}



movieRouter.route('/:categoryId/:movieId/:repeatId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    const url= cinetecaUrl + '/' + req.params.categoryId + '/' + req.params.movieId + '/?' + req.params.repeatId;  
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})    
    .then(res => res.text())
    .then((res) => parseUtils.forceCharachtersEncoding(res))
    .then(html => {
        const details = parseMovieDetail(html, url);
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


module.exports = movieRouter;