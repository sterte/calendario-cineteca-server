const express = require('express');
const cors = require('cors');
const app = express();

const whitelist = ['http://localhost:3001', 'http://localhost:3000', 'https://localhost:3443'];


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