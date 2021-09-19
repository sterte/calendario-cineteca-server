const secrets = require('./secrets');


module.exports = {
    'secretKey': secrets.secretMain,
    'mongoUrl': 'mongodb+srv://cinetecalendar:lKa9YpNKufvIMKLE@cluster-sterte.ommw6.mongodb.net/myFirstDatabase?retryWrites=true&w=majority'
    /*,
    'facebook' : {
        clientId: '397746814547445',
        clientSecret: secrets.secretFacebook,
        redirect_uri: 'https://localhost:3443/index.html'
    },
    'google': {
        clientId: '383543149444-ne9f07vriuh4alafeqsgq37069kqqu6d.apps.googleusercontent.com',
        clientSecret: secrets.secretGoogle,
        redirect_uri: 'https://localhost:3443'
    }*/
}
