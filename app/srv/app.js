//
// Dockerblog
//
//


// import GLOBAL modules
var express = require('express');
var compression = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

// import LOCAL modules
var posts = require('./modules/posts');
var lang = require('./modules/lang');
var files = require('./modules/files');
files.init(__dirname + "/public");
var admin = require('./modules/admin');



// create an express server app
var app = express();

// TO CHECK
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

// we use compression module to compress the responses
app.use(compression());

// cookie-parser as an 'optional secret string' param
app.use(cookieParser());

// not sure we need this one ... need confirmation (for regular forms maybe ??)
// parse application/json and application/x-www-form-urlencoded
app.use(bodyParser());

// TODO:
// we still need to handle "multipart/form-data" also known as file uploads
// with busboy probably
//app.use(express.bodyParser({ uploadDir:__dirname + '/uploads' }));

// 'static' middleware is still part on Express
app.use(express.static(__dirname + '/public'));


// blog modules
app.use('/admin', admin.app);
app.use('/lang', lang.app);
app.use(lang.use);


// SHOULD BE ONLY CALL IN /ADMIN
app.post('/image', function (req, res)
{
  files.saveFile(req,res);
});


app.use('/', posts.app);
app.use('*',posts.app);



// TODO: move that on a config.js file
var port = 80;

app.listen(port, function() 
{
  console.log("Dockerblog started\nListening on " + port);
});




