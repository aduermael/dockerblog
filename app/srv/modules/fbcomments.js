
var cluster = require('cluster');

var express = require('express');
var app = express();

var db = require('./db').connect();
var fs = require('fs');

var keys = require('./keys');
var lang_module = require('./lang');

var tools = require('./tools');

var posts = require('./posts');



exports.collect = function(intervalObject)
{
	// console.log("collect");


	var options = {
		host: GLOBAL.fbcomments_server_ip,
		port: GLOBAL.fbcomments_server_port,
		path: '/collect',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		}
	};


	fs.readFile(GLOBAL.private_dir_path + '/fbcomments_config.json', function (err, data)
	{
		if (err)
		{
			// can't collect comments
		}
		else
		{
			var config = JSON.parse(data);
			var clientID = config.clientID;
			var clientSecret = config.clientSecret;


			db.hgetall("fbcomments",function(error,fbcommentInfos)
			{
				if (error || !fbcommentInfos)
				{
					// to nothing
				}
				else
				{	
					/* SAMPLE
					{ postUpdate: 1416785465120,
					  fbPostID: 'xxx',
					  postID: '1',
					  since: 0 }
					*/

					var now = Date.now();
					var maxTime = (15 * 24 * 60 * 60 * 1000);

					// to destroy entries that are too old
					var multi = db.multi();

					Object.keys(fbcommentInfos).forEach(function(key)
					{
						var entry = JSON.parse(fbcommentInfos[key]);

						if (parseInt(entry.postUpdate)+ maxTime > now)
						{
							var request_body = {};
							request_body.clientID = clientID
							request_body.clientSecret = clientSecret;
							request_body.postID = entry.postID;
							request_body.fbPostID = entry.fbPostID;
							request_body.since = entry.since;
							request_body.postUpdate = entry.postUpdate;

							// console.dir(request_body);

							tools.send_http_request(options, collectCallback, request_body);
						}
						else
						{
							// expired, stop collecting comments for this post
							multi.hdel("fbcomments",entry.postID);
						}

					});

					multi.exec();
				}
			});

		}
	});
}

function collectCallback(success,statusCode,comments)
{
	// comments.success
	// comments.data [{name,message,created_time}]
	// comments.req (initial req body without clientID & clientSecret)

	if (success)
	{
		if (comments.success)
		{
			// console.log("collectCallback: " + success + " code: " + statusCode + " comments: " + comments.data.length);	

			if (comments.data.length > 0)
			{
				// console.dir(comments.req);
				// console.log("to insert in post " + comments.req.postID + ":");

				var older = 0;

				for (var i = 0; i < comments.data.length; i++)
				{
					var comment = comments.data[i];
					// console.log(comment.name + " " + comment.created_time);

					if (parseInt(comment.created_time) > older) older = comment.created_time;

					// com {name,content,timestamp,postID}

					comment.name = decodeURIComponent(comment.name);
					comment.content = decodeURIComponent(comment.message);
					delete comment.message;
					comment.timestamp = comment.created_time * 1000; // facebook uses time in seconds
					comment.from = "facebook"; // to know it comes from facebook
					delete comment.created_time;
					comment.postID = comments.req.postID;

					posts.postInternalComment(comment,function(success)
					{
						// console.log("postInternalComment " + success);
					});
				}

				// update since value to avoid getting these comments again
				// console.log("since: " + older);

				var fbcommentInfos = {};
				fbcommentInfos.postUpdate = comments.req.postUpdate;
				fbcommentInfos.fbPostID = comments.req.fbPostID;
				fbcommentInfos.postID = comments.req.postID;
				fbcommentInfos.since = older;

				// console.dir(fbcommentInfos);

				db.hset("fbcomments",comments.req.postID,JSON.stringify(fbcommentInfos));
			}

		}
		else
		{
			//console.log("collectCallback: " + success + " but no comments");
		}
	}
	else
	{
		//console.log("collectCallback: " + success);	
	}


}

