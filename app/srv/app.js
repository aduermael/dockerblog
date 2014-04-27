
var express = require('express');


var posts = require('./modules/posts');

var lang = require('./modules/lang');

var files = require('./modules/files');
files.init(__dirname + "/public");

var admin = require('./modules/admin');



var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');


app.use(express.compress());
app.use(express.cookieParser());

app.use(express.bodyParser({ uploadDir:__dirname + '/uploads' }));
app.use(express.static(__dirname + '/public'));

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




var port = 80;

app.listen(port, function() {
  console.log("Listening on " + port);
});


