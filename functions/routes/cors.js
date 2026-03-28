const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = [
    'https://cinetecalendar.web.app',
    'https://cinetecalendar.firebaseapp.com',
    'http://www.cinetecadibologna.it',
    'http://localhost:3000',
    'http://localhost:3001'];


var corsOptionDelegate = (req, cb) => {
    var corsOptions;
    if(whitelist.indexOf(req.header('Origin')) !== -1){
        corsOptions = { origin: true };
    }
    else{
        corsOptions = { origin: false };
    }
    cb(null, corsOptions);
};


exports.cors = cors(corsOptionDelegate);
exports.corsWithOptions = cors(corsOptionDelegate);