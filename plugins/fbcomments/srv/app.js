//
// Dockerblog
//
//

GLOBAL.redis_server_ip = "localhost";
GLOBAL.redis_server_port = 6379;

GLOBAL.views_dir_path = "/dockerblog_files/private/views";
GLOBAL.public_dir_path = "/dockerblog_files/public";
GLOBAL.private_dir_path = "/dockerblog_files/private";
GLOBAL.uploads_dir = "uploads"; // in public directory

// import GLOBAL modules
var express      = require('express');
var compression  = require('compression');
var cookieParser = require('cookie-parser');
var bodyParser   = require('body-parser');
var session      = require('express-session');
var RedisStore   = require('connect-redis')(session);


// import LOCAL modules
var tools = require('./modules/tools');



// create an express server app
var app = express();

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


var oneDay = 86400000;

// 'static' middleware is still part on Express
app.use(express.static(GLOBAL.public_dir_path, { maxAge: oneDay }));


// log the original url of all incoming requests
app.use(log_request_url);


// TODO: move that on a config.js file
var port = 80;

app.listen(port, function() 
{
  console.log("FB comments started\nListening on " + port);
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
	console.log('--- ' + req.originalUrl);
	next();
}


