const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = [
    'http://93.41.136.135:3001', 
    'http://192.168.1.20:3001', 
    'http://localhost:3001',
    'http://localhost:3000',
    'https://localhost:3443',
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