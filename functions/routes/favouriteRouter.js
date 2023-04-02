const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const authenticate = require('../authenticate');
const Favourites = require('../models/favourite');

const favouriteRouter = express.Router();

favouriteRouter.use(bodyParser.json());

favouriteRouter.route('/')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, authenticate.verifyUser, (req, res, next) => {
    Favourites.find({user: req.user._id})
    .populate('user')
    .then((favourites) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(favourites);
    }, (err) => next(err))
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {    
    Favourites.create({...req.body, user: req.user._id})
    .then((favourite) => {
        Favourites.findById(favourite._id)
        .populate('user')
        .then((favourite) => {
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.json(favourite);  
        })
    }, (err) => {console.log(err); return next(err)})
    .catch((err) => next(err))
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('PUT operation not supported on /favourites');
})
.delete(cors.corsWithOptions, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next) => {
    Favourites.remove({})
    .then((resp) => {        
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.json(resp);
    }, (err) => next(err))
    .catch((err) => next(err))
});

favouriteRouter.route('/:favouriteId')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.cors, (req, res, next) => {
    Favourites.findById(req.params.favouriteId)
    .then((favourite) => {
        if(favourite != null){
            if(!favourite.user.equals(req.user._id)){
                err = new Error('You are not authorized to visualize this content.');
                err.status = 403;
                return next(err);
            }
            else{
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(favourite);
            }
        }
        else{
            err = new Error('Favourite ' + req.params.favouriteId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => next(err))    
    .catch((err) => next(err));
})
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    res.statusCode = 403;
    res.end('POST operation not supported on /favourites/' + req.params.favouriteId);
})
.put(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {    
    Favourites.findById(req.params.favouriteId)
    .then((favourite) => {
        if(favourite != null){
            if(!favourite.user.equals(req.user._id)){
                err = new Error('You are not authorized to modify this favourite.');
                err.status = 403;
                return next(err);
            }
            req.body.user = req.user._id;
            Favourites.findByIdAndUpdate(req.params.favouriteId, { $set: req.body }, {new: true}) //new:true ensures that the comment is injected in the returned value to be used with 'then'
            .then((favourite) => {
                Favourites.findById(favourite._id)
                .populate('user')
                .then((favourite) => {
                    console.log('d');
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'application/json');
                    res.json(favourite);
                }, (err) => {console.log(err); next(err)})
            }, (err) => {console.log(err); next(err)})
        }
        else{
            err = new Error('Favourite ' + req.params.favouriteId + ' not found');
            err.status = 404;
            return next(err);
        }
    }, (err) => {console.log(err); next(err)})    
    .catch((err) => {console.log(err); next(err)});
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    Favourites.findById(req.params.favouriteId)
    .then((favourite) => {
        if(favourite != null){
            if(!favourite.user.equals(req.user._id)){
                err = new Error('You are not authorized to delete this favourite.');
                err.status = 403;
                return next(err);
            }
            Favourites.findByIdAndRemove(req.params.favouriteId)
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            })
            .catch((err) => next(err));
        }     
        else {
            err = new Error('Favourite ' + req.params.favouriteId + ' not found');
            err.status = 404;
            return next(err);
        }        
    }, (err) => next(err))
    .catch((err) => next(err))
});

module.exports = favouriteRouter;

