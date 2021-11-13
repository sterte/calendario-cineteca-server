const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const parseUtils = require('../parseUtils')
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
        durata = durata.replace(/<[^>]*>?/gm, '');      
        var image = parsed.getElementsByClassName('mainSection')[0].getElementsByClassName('backgroundCover').length > 0 ? parsed.getElementsByClassName('mainSection')[0].getElementsByClassName('backgroundCover')[0].getAttribute('style') : '';             

        const from = image.indexOf('url(')+4;
        const to = image.indexOf(')', from);        
        image = image.substr(from, to-from);                
        
        var buyLink = parsed.getElementsByClassName('ticketButton').length > 0 ? parsed.getElementsByClassName('ticketButton') : '';
        buyLink = buyLink.length > 0 ?  buyLink[0].getElementsByTagName('a')[0].getAttribute('href') : '';
        
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

        const isVO = parsed.getElementsByClassName('languageSideItem').length > 0 ? parsed.getElementsByClassName('languageSideItem')[0].getElementsByClassName('originalVersion').length : false;        
        
        //const costi = parsed.getElementsByClassName('costi')[0].innerHTML.replace(/<a .*<\/a>/g, '').replace('h2', 'h5');    
        let extras = parsed.getElementsByClassName('specialEventWrap');
        let extrasString = '';
        if(extras.length > 0){
            extras = parsed.getElementsByClassName('specialEventWrap')[0];            
            extrasString = extras.getElementsByClassName('mainLabel').length > 0 ? extras.getElementsByClassName('mainLabel')[0].innerHTML : '';
            extras = extras.getElementsByClassName('repeatInfo');                  
            for(let i=0;i<extras.length;i++){                          
                let extra = extras[i];
                extrasString = extrasString + '<br>' + extra.innerHTML;
            }            
        }

        var pagRepliche = parsed.getElementsByClassName('sameRepeatsStreamWrap');            
        var days = [];
        var hours = [];
        var place = "";
        var oldData;
        var currentHour;

        if(parsed.getElementsByClassName('overTitle').length > 0){
            replica = parsed.getElementsByClassName('overTitle')[0];
            const weekDay =  parsed.getElementsByClassName('datel')[0].innerHTML.substr(0,3) + ' ';
            const hours = {isVO: false, additionalInfo:extrasString, orario: replica.getElementsByClassName('hours')[0].innerHTML};
            data = replica.getElementsByClassName('date')[0];
            data = weekDay + ' ' + data.getElementsByClassName('dated')[0].innerHTML + ' ' + data.getElementsByClassName('dateM')[0].innerHTML + ' ' + data.getElementsByClassName('dateY')[0].innerHTML.substr(2);                    
            if(replica.getElementsByClassName('place').length > 0){
                place = replica.getElementsByClassName('place')[0].getElementsByTagName('a')[0].innerHTML;
            }
            currentHour = {place : place, day: data, hours: [hours]};
        } 

        if(pagRepliche.length>0){
            pagRepliche = pagRepliche[0].getElementsByClassName('itemLoop');
            if(pagRepliche.length>0){
                var i;                
                for(i=0; i<pagRepliche.length; i++){         
                    var data = pagRepliche[i].getElementsByClassName('date')[0];
                    data = data.getElementsByClassName('dateD')[0].innerHTML + ' ' + data.getElementsByClassName('datej')[0].innerHTML + ' ' + data.getElementsByClassName('dateM')[0].innerHTML + ' ' + data.getElementsByClassName('datey')[0].innerHTML;
                    if(data != oldData && oldData != null){
                        days.push({place: oldLuogo, day: oldData, hours: hours});
                        hours = [];
                        place = "";
                    }
                    const orario = pagRepliche[i].getElementsByClassName('time')[0].innerHTML;
                    const luogo = pagRepliche[i].getElementsByClassName('place')[0].innerHTML;
                    const isVO = pagRepliche[i].getElementsByClassName('originalVersion').length > 0;    
                    var additionalInfo = "";
                    var additionalInfoNode = pagRepliche[i].getElementsByClassName('infoWrap');
                    if(additionalInfoNode.length > 0){
                        additionalInfoNode = additionalInfoNode[0].getElementsByTagName('p');
                        if(additionalInfoNode.length > 0){
                            additionalInfo = additionalInfoNode[0].innerHTML;
                        }
                    }                    
                    hours.push({orario: orario, isVO: isVO, additionalInfo: additionalInfo});    
                    //hours.push(orario);    
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
    console.log(url);
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