const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const movieRouter = express.Router();
movieRouter.use(bodyParser.json());


const parseMovieDetail = (html, originalUrl) => {    
    try{
        var movie = {};    
        const parser = new DOMParser();
        const parsed = parser.parseFromString(html, 'text/html');    

        const title = parsed.getElementsByClassName('postTitle').length > 0 ? parsed.getElementsByClassName('postTitle')[0].innerHTML : '';                
        var durata = parsed.getElementsByClassName('infoTitle').length > 0 ? parsed.getElementsByClassName('infoTitle')[0].innerHTML : '';        
        var image = parsed.getElementsByClassName('mainSection')[0].getElementsByClassName('backgroundCover').length > 0 ? parsed.getElementsByClassName('mainSection')[0].getElementsByClassName('backgroundCover')[0].getAttribute('style') : '';             
        console.log("IMAGE="+image);
        const from = image.indexOf('url(')+4;
        const to = image.indexOf(')', from);        
        image = image.substr(from, to-from);                
console.log("IMAGE="+image)
        const buyLink = parsed.getElementsByClassName('getTicketSection').length > 0 ?  parsed.getElementsByClassName('ticketButton')[0].getElementsByTagName('a')[0].getAttribute('href') : '';
        
        var sinossi;
        if(parsed.getElementsByClassName('movieDescription').length > 0){
            sinossi = parsed.getElementsByClassName('movieDescription')[0].innerHTML;
        }
        else if(parsed.getElementsByClassName('repeatDescription').length > 0){
            sinossi = parsed.getElementsByClassName('repeatDescription')[0].innerHTML;
        }
        else{
            sinossi = '';
        }

        const isVO = parsed.getElementsByClassName('languageSideItem')[0].getElementsByClassName('originalVersion').length;
        
        //const costi = parsed.getElementsByClassName('costi')[0].innerHTML.replace(/<a .*<\/a>/g, '').replace('h2', 'h5');    
        const extras = parsed.getElementsByClassName('specialEventWrap').length > 0 ? parsed.getElementsByClassName('specialEventWrap')[0].getElementsByClassName('mainLabel')[0].innerHTML : '';

        var pagRepliche = parsed.getElementsByClassName('sameRepeats');    
        var days = [];
        var hours = [];
        var oldData;
        var currentHour;

        if(parsed.getElementsByClassName('overTitle').length > 0){
            data = parsed.getElementsByClassName('overTitle')[0];
            const weekDay =  parsed.getElementsByClassName('datel')[0].innerHTML.substr(0,3) + ' ';
            const hours = data.getElementsByClassName('hours')[0].innerHTML;
            data = data.getElementsByClassName('date')[0];
            data = weekDay + ' ' + data.getElementsByClassName('dated')[0].innerHTML + ' ' + data.getElementsByClassName('dateM')[0].innerHTML + ' ' + data.getElementsByClassName('dateY')[0].innerHTML.substr(2);        
            currentHour = {day: data, hours: [hours]};
        } 

        if(pagRepliche.length>0){
            pagRepliche = pagRepliche[0].getElementsByClassName('itemLoop');
            if(pagRepliche.length>0){
                var i;                
                for(i=0; i<pagRepliche.length; i++){         
                    var data = pagRepliche[i].getElementsByClassName('date')[0];
                    data = data.getElementsByClassName('dateD')[0].innerHTML + ' ' + data.getElementsByClassName('datej')[0].innerHTML + ' ' + data.getElementsByClassName('dateM')[0].innerHTML + ' ' + data.getElementsByClassName('datey')[0].innerHTML;
                    if(data != oldData && oldData != null){
                        days.push({day: oldData, hours: hours});
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
                
        movie = {title: title, duration: durata, summary: sinossi, image: image, currentHour: currentHour, hours: days, originalUrl: originalUrl, buyLink: buyLink, extras: extras, isVO: isVO};        
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
    console.log(url);
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})    
    .then(res => res.text())
    .then(html => {
        const details = parseMovieDetail(html, url);
        if(details.errMess){
            res.statusCode = 500;
            res.statusMessage = error;
        }else{
            res.json(details);
        }        
    })    
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