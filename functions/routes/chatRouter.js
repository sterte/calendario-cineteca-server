const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const authenticate = require('../authenticate');
const fetch = require('node-fetch');
const openAIConstants = require('../shared/openAIConstants');
const NodeCache = require('node-cache');
var myCache = new NodeCache();

const chatRouter = express.Router();

chatRouter.use(bodyParser.json());

chatRouter.route('/prompt')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {    
    const url = openAIConstants.url + '/v1/chat/completions';

    var conversationId = req.body.conversationId;
    var lastMessages = [];
    if(!conversationId){
        var charachter = req.body.charachter;
        if(!charachter){
            err = new Error('Malformed request: no charachter selected, no conversationId given.');
            err.status = 400;
            return next(err);
        }
        conversationId = new Date().getTime();
        lastMessages = [... openAIConstants.initialMessages[charachter]];
    } else {
        lastMessages = myCache.get(conversationId);
    }

    lastMessages.push({"role": "user", "content": req.body.question});
    myCache.set(conversationId, lastMessages);

    var requestMessages = lastMessages;
    let actualHistory = openAIConstants.chatHistoryLenght;
    if(actualHistory % 2 === 0){
        actualHistory = actualHistory +1;
    }
    if(requestMessages.length > actualHistory){
        requestMessages = lastMessages.splice(-1 * actualHistory);
        requestMessages.unshift(lastMessages[0]);
    }

    let actualTemperature = req.body.temperature;
    if(!actualTemperature){
        actualTemperature = openAIConstants.temperature;
    }

    var body = {
        "model": openAIConstants.model,
        "messages": requestMessages,
        "temperature": actualTemperature
    };


    return fetch(url, {
        method: 'POST',
        headers:{
            'Authorization': 'Bearer ' + openAIConstants.token,
            'OpenAI-Organization' : openAIConstants.organizationId,
            'Content-Type': "application/json",
        },
        body: JSON.stringify(body)
    })    
    .then(gptRes => gptRes.json())    
    .then(gptRes => {
        var result = {
            "role": gptRes.choices[0].message.role,
            "content": gptRes.choices[0].message.content,
            "conversationId": conversationId,
            "timestamp": gptRes.created
        }
        if(req.user.admin){
            result["tokenCount"] = gptRes.usage.total_tokens;
        }
        var lastMessages = myCache.get(conversationId);
        lastMessages.push({"role": gptRes.choices[0].message.role, "content": gptRes.choices[0].message.content});
        myCache.set(conversationId, lastMessages);
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.json(result);
    })
    .catch((err) => {console.dir(err); next(err)});   
})

module.exports = chatRouter;

