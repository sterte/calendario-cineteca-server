const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const fetch = require('node-fetch');
const parseUtils = require('../parseUtils')
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const dayRouter = express.Router();
dayRouter.use(bodyParser.json());


const parseDayProgram = (html) => {  
    try{  
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');    
    const movies = parsed.getElementById('archiveReplace').childNodes;//.getElementsByTagName('article');

    
    var i;
    var moviesJson = [];
    var tmpMovies = [];
    var currentDay;
    for(i=0; i<movies.length; i++){                
        if(movies[i].getAttribute('class') && movies[i].getAttribute('class').indexOf('repeatDayName') > -1){
            if(tmpMovies.length){
                moviesJson.push({day: currentDay, movies: tmpMovies});
                tmpMovies = [];
            }            
            currentDay = movies[i].getAttribute('date');                        
        }
        else if(movies[i].getAttribute('class') && movies[i].getAttribute('class').indexOf('itemLoop') > -1){
            const movie = movies[i];          
            tmpMovies.push(parseUtils.parseMovie(movie, i));                                                          
        }                               
    }        
    return moviesJson;
    }catch(error){
        console.log(error);
    }
}

/* PARSING OLD CINETECA WEBPAGE
const parseDayProgramOLD = (html) => {    
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');    
    const day = parsed.getElementById("elenco_giorno");    
    const movies = day.getElementsByClassName('clearfix');    
    var i;
    var moviesJson = { movies: []};
    for(i=0; i<movies.length; i++){
        const movie = movies[i]        
        var place = movie.getElementsByClassName('luogo').length > 0 ?  movie.getElementsByClassName('luogo')[0].innerHTML : '-';        
        const time = movie.getElementsByClassName('ora').length > 0 ?  movie.getElementsByClassName('ora')[0].innerHTML : '-';
        const title = movie.getElementsByClassName('caption').length > 0 ? movie.getElementsByClassName('caption')[0].getElementsByTagName('a')[0].innerHTML : '-';
        var url = movie.getElementsByClassName('caption');
        var id;
        if(url.length > 0){
            url = url[0].getElementsByTagName('a')[0].getAttribute('href')
            const from = url.indexOf('/app_');
            const to = url.indexOf('/', from+1);            
            id = url.substr(from+1, to-from-1);
            url = cinetecaUrl + url.substr(url.indexOf('/vedere'));
        }else{
            url=''
        }

        var image = movie.getElementsByClassName('thumb')
        if(image.length > 0){
            image = image[0].getElementsByTagName('img')[0].getAttribute('src')            
            image = cinetecaUrl + image.substr(image.indexOf('/imageserver'));
        }else{
            image=''
        }                

        var isVO = false;
        var extras = movie.getElementsByClassName('extra');        
        if(extras.length > 0){            
            extras = extras[0].getElementsByTagName('img');            
            var j;
            for(j=0; j<extras.length; j++){                                
                if(extras[j].getAttribute('src').valueOf().indexOf('subtitles.gif') > -1){
                    isVO = true;
                    break;
                }
            }
        }

        var isMUSIC = false;
        extras = movie.getElementsByClassName('extra');
        if(extras.length > 0){
            extras = extras[0].getElementsByTagName('img');
            for(j=0; j<extras.length; j++){                                
                if(extras[j].getAttribute('src').valueOf().indexOf('nota.gif') > -1){
                    isMUSIC = true;
                    break;
                }
            }
        }

        moviesJson.movies.push({           
            key: i,
            id: id,             
            title: title,
            place: place,
            time: time,
            url: url,
            image: image,
            isVO: isVO,
            isMUSIC: isMUSIC
        });        
    }    
    return moviesJson;    
}
*/

dayRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })

dayRouter.route('/:from/:to')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {    
    const url = cinetecaUrl + '/programma/?from='+ req.params.from +'&to='+ req.params.to;
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})        
    .then(res => res.text())    
    .then((res) => parseUtils.forceCharachtersEncoding(res))
    .then(html => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        var result = parseDayProgram(html);
        res.json(result);
    })
    .catch((err) => {console.log(err); next(err)});    


}, (err) => {console.log(err); next(err)})
.post(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /days');
})
.put(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /days');
})
.delete(cors.cors, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported for /days');
})

module.exports = dayRouter;