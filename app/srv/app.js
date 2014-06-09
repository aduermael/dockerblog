//
// Dockerblog
//
//

GLOBAL.redis_server_ip = process.env.DB_PORT_6379_TCP_ADDR;
GLOBAL.redis_server_port = process.env.DB_PORT_6379_TCP_PORT;

GLOBAL.views_dir_path = "/dockerblog_files/private/views";
GLOBAL.public_dir_path = "/dockerblog_files/public";
GLOBAL.uploads_dir = "uploads"; // in public directory

// import GLOBAL modules
var express      = require('express');
var compression  = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var busboy       = require('connect-busboy');

// import LOCAL modules
var posts = require('./modules/posts');
var pages = require('./modules/pages');
var lang = require('./modules/lang');
var files = require('./modules/files');
var admin = require('./modules/admin');



// create an express server app
var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');

// we use compression module to compress the responses
app.use(compression());

// cookie-parser as an 'optional secret string' param
app.use(cookieParser());

// not sure we need this one ... need confirmation (for regular forms maybe ??)
// parse application/json and application/x-www-form-urlencoded
app.use(bodyParser());
// we handle "multipart/form-data" (file uploads) with busboy module
app.use(busboy({immediate: true}));

// 'static' middleware is still part on Express
app.use(express.static(GLOBAL.public_dir_path));

// log the original url of all incoming requests
// app.use(log_request_url);

// blog modules
app.use('/admin', admin);
app.use('/lang', lang.app);
app.use(lang.use);


// SHOULD BE ONLY CALL IN /ADMIN
app.post('/image', function (req, res)
{
  files.saveFile(req,res);
});


app.use('/', posts.app);
app.use('/', pages.app);
app.use('*', posts.renderPosts2);



// TODO: move that on a config.js file
var port = 80;

app.listen(port, function() 
{
  console.log("Dockerblog started\nListening on " + port);
});


//---------------------------------------------------------------------
// UTILITY FUNCTIONS
//---------------------------------------------------------------------

//
// MIDDLEWARE
// log the incoming request
//
function log_request_url (req, res, next)
{
	console.log('');
	console.log('--- REQUEST [ '+req.originalUrl+' ]');
	next();
}


