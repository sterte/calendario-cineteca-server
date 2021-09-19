const functions = require('firebase-functions');

const express = require('express');
const PORT = 3000;
const app = express();

app.get('/hello', (req, res, next) => {
    res.send('Ciao');
});
app.listen(PORT);
exports.app = functions.https.onRequest(app);
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
