//
// Dockerblog
//
//


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

// log the original url of all incoming requests
// app.use(log_request_url);


app.post('/collect', function(req, res, next)
{
	// req.body sample
	/*{
		clientID: '***',
		clientSecret: '***',
		postID: '1',
		fbPostID: '***',
		since: 0
	}*/

    collect(req.body.clientID,req.body.clientSecret,req.body.fbPostID,req.body.since,function(comments)
    {
		// comments.success
		// comments.data

		if (comments.success && comments.data)
		{
			//console.log(JSON.stringify(comments));
			comments.req = req.body;
			delete comments.req.clientID;
			delete comments.req.clientSecret;
			
			//console.log("comments returned: " + comments.data.length);
		}
		else
		{
			//console.log("error");
		}

		tools.returnJSON(res,comments);

    });

});


// TODO: move that on a config.js file
var port = 80;

app.listen(port, function() 
{
  console.log("FB comments started\nListening on " + port);
});


var FB = require('fb');




function getPagePostComments(postID,accessToken,after,callback)
{
	var request;

	if (after != "")
	{
		request = postID + "/comments?access_token=" + accessToken + "&date_format=U&limit=25" + "&after=" + after;
	}
	else
	{
		request = postID + "/comments?access_token=" + accessToken + "&date_format=U&limit=25";
	}

	FB.api(request, function (res)
	{
		// test if !res or res.error in callback
		callback(res);
	});
}




function getOauthToken(clientID,clientSecret,clientCredentials,callback)
{
	FB.api('oauth/access_token',{client_id:clientID,client_secret:clientSecret,grant_type:clientCredentials},function(res)
	{
		// test if !res or res.error in callback
		callback(res.access_token);
	});
}



function collectPostComments(postID,accessToken,since,callback)
{
	var commentsCollection = {};
	commentsCollection.success = false
	commentsCollection.collected = [];
	commentsCollection.nextPage = "";


	collectPostCommentsStep(postID,accessToken,since,commentsCollection,function(updatedCommentsCollection)
	{
		if (updatedCommentsCollection.success)
		{
			//console.log("Total collected: " + updatedCommentsCollection.collected.length);
			callback(true,updatedCommentsCollection.collected);
		}
		else
		{
			callback(false);
		}

	});
}


function collectPostCommentsStep(postID,accessToken,since,commentsCollection,callback)
{
	getPagePostComments(postID,accessToken,commentsCollection.nextPage,function(comments)
	{
		if (!comments || comments.error)
		{
			callback(false);
			return;
		}

		//console.log("Collected " + comments.data.length + " comments");

		for (var i = 0; i < comments.data.length; i++)
		{
			if (comments.data[i].created_time > since)
			{
				var comment = {};
				comment.name = encodeURIComponent(comments.data[i].from.name);
				comment.created_time = comments.data[i].created_time;
				comment.message = encodeURIComponent(comments.data[i].message);

				commentsCollection.collected.push(comment);
			}
		}

		if (comments.paging && comments.paging.next)
		{
			commentsCollection.nextPage = comments.paging.cursors.after; 
			collectPostCommentsStep(postID,accessToken,since,commentsCollection,callback);
		}
		else
		{
			// Last page reached, callback!
			commentsCollection.success = true;
			callback(commentsCollection);
		}
	});
}




function collect(clientID,clientSecret,postID,since,callback)
{
	
	getOauthToken(clientID,clientSecret,"client_credentials",function(token)
	{
		if (!token || token.error)
		{
			callback({success:false});
			return;
		}

		collectPostComments(postID,token,since,function(success,comments)
		{
			if (success)
			{
				callback({success:true,data:comments});
			}
			else
			{
				callback({success:false});
			}
		});
	});

}

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


