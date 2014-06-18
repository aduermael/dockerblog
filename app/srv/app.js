//
// Dockerblog
//
//

GLOBAL.redis_server_ip = process.env.DB_PORT_6379_TCP_ADDR;
GLOBAL.redis_server_port = process.env.DB_PORT_6379_TCP_PORT;

GLOBAL.views_dir_path = "/dockerblog_files/private/views";
GLOBAL.public_dir_path = "/dockerblog_files/public";
GLOBAL.private_dir_path = "/dockerblog_files/private";
GLOBAL.uploads_dir = "uploads"; // in public directory

// import GLOBAL modules
var express      = require('express');
var compression  = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var busboy       = require('connect-busboy');
var session      = require('express-session');
var RedisStore   = require('connect-redis')(session);


// import LOCAL modules
var posts = require('./modules/posts');
var pages = require('./modules/pages');
var lang  = require('./modules/lang');
var admin = require('./modules/admin');
var tools = require('./modules/tools');



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

var options = {};
options.ttl = 60 * 60 * 5; // session ttl -> 5 hours

app.use(session({ store: new RedisStore(options), secret:'5c8be406c43595d4143b96043d0cfd6f'}))

// we handle "multipart/form-data" (file uploads) with busboy module
app.use(busboy({immediate: true}));

var oneDay = 86400000;

// 'static' middleware is still part on Express
app.use(express.static(GLOBAL.public_dir_path, { maxAge: oneDay }));

// log the original url of all incoming requests
// app.use(log_request_url);

// blog modules
app.use('/admin', admin);

// For anything posted by a non-admin user
// We check if the message was posted long enough after page rendering
// It helps getting rid of some spam robots
app.post('*',tools.killFastRobots);

app.use('/lang', lang.app);
app.use(lang.use);

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


