const express = require('express');
const bodyParser = require('body-parser');
const cors = require('./cors');
const authenticate = require('../authenticate');
const openAIConstants = require('../shared/openAIConstants');
const NodeCache = require('node-cache');
const AiConversation = require('../models/aiConversation');
const AiMessage = require('../models/aiMessage');
var myCache = new NodeCache();

const chatRouter = express.Router();

chatRouter.use(bodyParser.json());


chatRouter.route('/previousConversations')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.get(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    AiConversation.find({user: req.user._id})
    .then((conversations) => {
        let result = conversations.map(el => {return {"value": el.conversationId, "label": el.title}})
        res.json(result);
    })
})
.delete(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    AiConversation.findOne({conversationId: req.body.conversationId})
    .then((conversation) => {
        if(conversation != null){
            if(!conversation.user.equals(req.user._id)){
                err = new Error('You are not authorized to delete this conversation.');
                err.status = 403;
                return next(err);
            }
            AiConversation.findByIdAndDelete(conversation._id)
            .then((resp) => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json(resp);
            })
            .catch((err) => next(err));
        }     
        else {
            err = new Error('Conversation ' + req.params.favouriteId + ' not found');
            err.status = 404;
            return next(err);
        }        
    }, (err) => next(err))
    .catch((err) => next(err))
});


chatRouter.route('/conversationLog')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {
    let result = {};
    AiConversation.findOne({user: req.user._id, conversationId: req.body.conversationId})
    .then((conversation) => {
        AiMessage.find({conversation: conversation._id})
        .then((messages) => {
            messages = messages.map(message => { return {
                    "role": message.role,
                    "content": message.content
                }  
            })
            result.conversationId = conversation.conversationId
            result.title = conversation.title,
            result.messages = messages
            myCache.set(result.conversationId, result.messages);
            res.json(result);
        })
    })
})

chatRouter.route('/prompt')
.options(cors.corsWithOptions, (req, res) => { res.sendStatus(200); })
.post(cors.corsWithOptions, authenticate.verifyUser, (req, res, next) => {    
    const url = openAIConstants.url + '/v1/chat/completions';

    var conversationId = req.body.conversationId;
    var lastMessages = [];
    var toCreate = false;
    var title = req.body.title;
    const requestType = req.body.requestType;

    if (requestType && openAIConstants.promptTemplates[requestType]) {
        // Info/similar request from movie page: build prompt from template
        toCreate = true;
        conversationId = new Date().getTime();
        const template = openAIConstants.promptTemplates[requestType];
        const movieTitle = req.body.movieTitle || '';
        const year = req.body.year || '';
        const spoiler = req.body.spoiler === true ? 'true' : 'false';
        const fill = (str) => str
            .replace(/\{\{title\}\}/g, movieTitle)
            .replace(/\{\{year\}\}/g, year)
            .replace(/\{\{spoiler\}\}/g, spoiler);
        lastMessages = [
            { role: 'system', content: fill(template.system) },
            { role: 'user',   content: fill(template.user) }
        ];
    } else {
        lastMessages = myCache.get(conversationId);
        lastMessages.push({"role": "user", "content": req.body.question});
    }
    myCache.set(conversationId, lastMessages);
    
    if(toCreate){
    AiConversation.create({ user: req.user._id, conversationId: conversationId, title: title})
        .then((conversation) => {
            AiMessage.create({ conversation: conversation._id, content: req.body.question, timestamp: new Date().getTime(), role: 'user'})
        })
    } else {
        AiConversation.findOne({ conversationId: conversationId})
        .then((conversation) => {
            AiMessage.create({ conversation: conversation._id, content: req.body.question, timestamp: new Date().getTime(), role: 'user'})
        })
    }

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
    if(!actualTemperature || actualTemperature === 0){
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
            'Content-Type': "application/json",
        },
        body: JSON.stringify(body)
    })    
    .then(gptRes => gptRes.json())
    .then(gptRes => {
        const geminiError = gptRes.error || (Array.isArray(gptRes) && gptRes[0]?.error);
        if (geminiError) {
            const err = new Error('Gemini error: ' + geminiError.message);
            err.status = geminiError.code === 429 ? 429 : 502;
            return next(err);
        }
        if (!gptRes.choices || !gptRes.choices[0]) {
            console.error('Unexpected Gemini response:', JSON.stringify(gptRes));
            const err = new Error('Gemini error: risposta inattesa dal modello');
            err.status = 502;
            return next(err);
        }
        var result = {
            "role": gptRes.choices[0].message.role,
            "content": gptRes.choices[0].message.content,
            "conversationId": conversationId,
            "timestamp": gptRes.created,
            "title": title
        }
        if(req.user.admin){
            result["tokenCount"] = gptRes.usage.total_tokens;
        }
        var lastMessages = myCache.get(conversationId);
        lastMessages.push({"role": gptRes.choices[0].message.role, "content": gptRes.choices[0].message.content});
        myCache.set(conversationId, lastMessages);

        AiConversation.findOne({ conversationId: conversationId})
        .then((conversation) => {
            AiMessage.create({ conversation: conversation._id, content: gptRes.choices[0].message.content, timestamp: gptRes.created, role: 'assistant'})
        })

        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 200;
        res.json(result);
    })
    .catch((err) => {console.dir(err); next(err)});   
})

module.exports = chatRouter;

