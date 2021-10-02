const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = [
    'https://cinetecalendar.web.app',
    'http://www.cinetecadibologna.it'];


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


exports.cors = cors();
exports.corsWithOptions = cors(corsOptionDelegate);