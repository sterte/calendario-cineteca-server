const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const parseUtils = require('../parseUtils')
const DOMParser = require('dom-parser');
const { cinetecaUrl } = require('../shared/baseUrl');


const dayRouter = express.Router();
dayRouter.use(bodyParser.json());


const parseDayProgram = (html, day) => {  
    try{  
    const parser = new DOMParser();
    const parsed = parser.parseFromString(html, 'text/html');  
    const movies = parsed.getElementsByClassName('c-show-repeat-loop');
    
    const moviesJson = [];
    const result = [];
    for(let i=0; i<movies.length; i++){
        const movie = movies[i];
        moviesJson.push(parseUtils.parseMovie(movie, i));
    }        
    result.push({day: day, movies: moviesJson});

    return result;
    }catch(error){
        console.log(error);
    }
}


dayRouter.route('*')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })

dayRouter.route('/:day')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {    
    const url = cinetecaUrl + '/film-in-programma/?data='+ req.params.day;
    return fetch(url, {headers:{
        contentType: "text/html; charset=iso-8859-1",
      }})        
    .then(res => res.text())    
    .then((res) => parseUtils.decodeEntities(res))
    .then(html => {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        const result = parseDayProgram(html, req.params.day);
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