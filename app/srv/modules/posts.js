//
//
//
//
//

var slug = require('slug');
var lang_module = require('./lang');
var tools = require('./tools');

var db = require('./db').connect();

var postsPerPage = 10;


var app = function()
{
	var express = require('express');
	var app = express();
	
	app.set('views', GLOBAL.views_dir_path);
	app.set('view engine', 'jade');

	app.get('/rss/:lang',renderRSS);	
	app.get('/rss',renderRSS);
	
	// TEMPORARY (redirection for users using old bloglaurel.com rss)
	app.get('/feed',renderFrenchRSS);
	app.get('/coeur',renderFrenchRSS);
	app.get('/coeur/rss.php',renderFrenchRSS);
	app.get('/coeur/atom.php',renderFrenchRSS);
	
	
	app.get('/',renderPosts);
	app.get('/page:PageID',renderPosts);
	app.get('/:slug/:PostID', renderOnePost );
	
	
	app.post('/comment', postComment );
	app.post('/contact', postContact ); // email form
			
	//app.get('*', renderPosts );	

	return app;
}();



function renderPosts(req,res)
{
	var page = req.params.PageID;
	if (!page) page = 1;
	
	// console.log("posts (page " + page + ")");
	
	list(req,(page - 1) , postsPerPage , function(error,content)
	{
		pages(req,postsPerPage ,function(nbPages)
		{				
			tools.renderJade(req,res,'posts',{ siteName: "Laurel",
			posts: content,
			pages: nbPages });
		});
	});
}



// TEMPORARY (redirection for users using old bloglaurel.com rss)

function renderFrenchRSS(req,res)
{
	// console.log("old rss");
	
	var page = 1;
	req.params.lang = "fr";
		
	list(req,(page - 1) , postsPerPage , function(error,content)
	{
		pages(req,postsPerPage ,function(nbPages)
		{	
			tools.renderJade(req,res,'rss',{ siteName: "Laurel" + " - " + "RSS",
			posts: content });
		});
	});
}




function renderRSS(req,res)
{
	// console.log("rss");
	
	var page = 1;
		
	list(req,(page - 1) , postsPerPage , function(error,content)
	{
		pages(req,postsPerPage ,function(nbPages)
		{	
			tools.renderJade(req,res,'rss',{ siteName: "Laurel" + " - " + "RSS",
			posts: content });
		});
	});
}


var renderPosts2 = function(req,res)
{
	// console.log("404: " + req.url);
	renderPosts(req,res);
}


function renderOnePost(req,res)
{	
	var postID = req.params.PostID;
	
	// console.log("post: " + postID);
	
	get(req,postID, function(error,post)
	{	
		if (error) // not found?
		{
			renderPosts(req,res);
		}
		else
		{
			getComments(req,postID,function(err,comments)
			{
				tools.renderJade(req,res,'post',
				{
					siteName: "Laurel" + " - " + post.title,
					post: post,
					comments: comments,
					commentName: req.cookies.comment_name_,
					commentEmail: req.cookies.comment_email_,
					commentGravatar: req.cookies.comment_gravatar_,
					commentTwitter: req.cookies.comment_twitter_,
					commentWebsite: req.cookies.comment_website_
				}); 
			});
		}
    
	});
}


function postContact(req,res)
{
	var message = req.body;
	
	var error = false;
	
	
	if ( message.email != "" && !validateEmail(message.email) )
	{
		error = true;
	}
	
	if (message.content == "")
	{
		error = true;
	}
	
	
	if (!error)
	{
		//console.log("Data is all good to send email. Now let's find the associated post...");
		
		get(req,message.postID, function(error,post)
		{	
			if (error) // not found?
			{
				var ret = {"success":false};
				tools.returnJSON(res,ret);
			}
			else
			{
				//console.log("Post found! now let's find the associated block...");
				
				if (post.blocks)
				{
					if (post.blocks.length > message.blockID)
					{
						var contactBlock = post.blocks[message.blockID];
												
						tools.sendMail(contactBlock.to,message.email,contactBlock.title + message.subject,message.content);
						
						var ret = {"success":true};
						tools.returnJSON(res,ret);	
					}
					else // not enough blocks???
					{
						var ret = {"success":false};
						tools.returnJSON(res,ret);
					}
				}
				else // no blocks???
				{
					var ret = {"success":false};
					tools.returnJSON(res,ret);
				}
			}
	    
		});
	}
	else
	{	
		var ret = {"success":false};
		tools.returnJSON(res,ret);
	}
}




function sendEmailOnAnswer(comID)
{
	// comID: the comment that has just been posted or accepted
	// we have to look if it answers to another comment
	// if so, if that other comment required an email on answers

	console.log("sendEmailOnAnswer com ID: " + comID);

	db.hmget(comID,"answerComID","name","content","gravatar","twitter","website",function(error,values)
	{
		var com = {};
		com.answerComID = values[0];

		if (com.answerComID)
		{
			console.log("comment is an answer to another comment"); 

			com.name = values[1];
			com.content = values[2];
			com.gravatar = values[3];
			com.twitter = values[4];
			com.website = values[5];

			var originalComID = "com_" + com.answerComID;
			 
			console.log("original com ID: " + originalComID);

			db.hmget(originalComID,"emailOnAnswer","email","name","content","gravatar","twitter","website",function(error2,values2)
			{
				var originalCom = {};
				originalCom.emailOnAnswer = values[0];

				if (originalCom.emailOnAnswer && originalCom.emailOnAnswer == 1)
				{
					console.log("An email should be sent");

					originalCom.email = values[1];
					originalCom.name = values[2];
					originalCom.content = values[3];
					originalCom.gravatar = values[4];
					originalCom.twitter = values[5];
					originalCom.website = values[6];

					var text = "";
					text += originalCom.name;
					text += "\n";
					text += originalCom.content;

					text += "\n\n";

					text += com.name;
					text += "\n";
					text += com.content;

					tools.sendMail(email,"laurelcomix@gmail.com",com.name + " answered your comment on bloglaurel.com",text);
				}
				else
				{
					console.log("comment is an answer to another comment, but email not requested");
				}
			});
		}
		else
		{
			console.log("comment is not an answer to another comment");
		}

	});

	/*
	db.hmget(answerComID,"emailOnAnswer","email","name","content",function(error,values)
	{
		if (!error && values)
		{
			var emailOnAnswer = values[0];	
			
			console.log("emailOnAnswer: " + emailOnAnswer);

			if (emailOnAnswer && emailOnAnswer == 1)
			{
				var email = values[1];
				var name = values[2];
				var content = values[3];

				console.log("send email!");

				var text = "";
				text += name;
				text += "\n\n";
				text += content;

				tools.sendMail(email,"laurelcomix@gmail.com","Someone answered your comment on bloglaurel.com",text);
			}

		}
		else
		{
			// fail does not return anything
		}
	});*/
}




function postComment(req,res)
{
	var com = req.body;
	
	//{"postID":"3","vID":"123456","name":"dsfsd","email":"","content":"sdfsdfsdf"}
	
	// VERIFICATION
	
	var error = false;
	
	if (com.name == "")
	{
		error = true;
	}
	
	if ( com.email != "" && !validateEmail(com.email) )
	{
		error = true;
	}
	
	if (com.content == "")
	{
		error = true;
	}

	com.website = formatWebsite(com.website);

	if (!validateWebsite(com.website))
	{
		delete com.website;
	}

	com.twitter = formatTwitter(com.twitter);

	if (!validateTwitter(com.twitter))
	{
		delete com.twitter;
	}
	
	if (!error)
	{
		// save nickname / email in cookie
		
		// compute gravatar hash
		if ( com.email != "" )
		{
			var s = com.email.toLowerCase();
			s = s.replace(/^s+/g,'').replace(/s+$/g,'');
			
			com.gravatar = tools.md5(s);
		}
		
		var hour = 3600000;
		
		if (com.remember)	
		{
			res.cookie('comment_name_', com.name, { maxAge: 365 * 24 * hour, httpOnly: false});
			
			if (com.email != "")
			{
				res.cookie('comment_email_', com.email, { maxAge: 365 * 24 * hour, httpOnly: false});
			}
			
			if (com.gravatar)
			{
				res.cookie('comment_gravatar_', com.gravatar, { maxAge: 365 * 24 * hour, httpOnly: false});
			}

			if (com.twitter)
			{
				res.cookie('comment_twitter_', com.twitter, { maxAge: 365 * 24 * hour, httpOnly: false});
			}

			if (com.website)
			{
				res.cookie('comment_website_', com.website, { maxAge: 365 * 24 * hour, httpOnly: false});
			}
		}
		
		
		comment(req,com,function(error)
		{
			if (error)
			{
				var ret = {"success":false};
				tools.returnJSON(res,ret);
			}
			else
			{
				var ret = {"success":true};
				tools.returnJSON(res,ret);	
			}
		});
	}
	else
	{
		var ret = {"success":false};
		tools.returnJSON(res,ret);
	}
}




Array.prototype.move = function (old_index, new_index) {
    if (new_index >= this.length) {
        var k = new_index - this.length;
        while ((k--) + 1) {
            this.push(undefined);
        }
    }
    this.splice(new_index, 0, this.splice(old_index, 1)[0]);
    return this; // for testing purposes
};


function getTotalChildren(comments,index)
{
	var directChildren = comments[index].children;
	var count = 0;
	
	var totalChildren = 0;
	
	while (count < directChildren)
	{
		totalChildren += 1;
		totalChildren += getTotalChildren(comments,index+totalChildren);
		count++;
	}
	
	return totalChildren;
}

var getComments = function(req,postID,callback)
{	
	db.zrange('comments_' + postID, 0, -1 ,function(err, keys)
	{
		if (err)
		{
			callback(err);
		}
		else
		{
			var multi = db.multi();
			
			keys.forEach(function (key)
			{
				multi.hgetall(key);			
			});
			
			multi.exec(function(err,replies)
			{
				replies.forEach(function(comment)
				{
					// for old comments with emails but not gravatar hashes, we make them on the fly
					if (comment.email && comment.email != "" && !comment.gravatar)
					{
						var s = comment.email.toLowerCase();
						s = s.replace(/^s+/g,'').replace(/s+$/g,'');
						comment.gravatar = tools.md5(s);
					}
					
					comment.indent = 0;
					comment.children = 0; // direct children
					
					comment.date = getPostTime(req,comment.date);
				});
				
				
				for (var i = 1; i < replies.length; i++)
				{
					var com = replies[i];
					
					if (com.answerComID)
					{
						for (var j = i -1; j >= 0; j--)
						{
							var older_com = replies[j];
							if (older_com.ID == com.answerComID)
							{
								com.indent = older_com.indent + 1;
								
								var totalChildren = getTotalChildren(replies,j);
								
								older_com.children++;
								
								// console.log("FOUND PARENT!");
								
								if ( i != j+ totalChildren )
								{
									replies.move(i,j+totalChildren+1);
								}
								
								break;
							}
						}	
					}
				}
				
				
				// console.dir(replies);
				
								
				callback(null,replies);
			});
		}
	});
}


// should work for several posts
var getNbComments = function(postID, callback)
{
	db.zcard('comments_' + postID,function(err, nb)
	{
		if (err)
		{
			callback(err);
		}
		else
		{
			callback(null,nb);
		}
	});
}




var comment = function(req,obj,callback)
{
	// CHECK IF POST EXISTS
	db.exists("post_" + obj.postID,function(error,postExists)
	{	
	
		if (error)
		{
			callback(error);
		}
		else
		{	
			if (postExists)
			{	
				// SAVE COMMENT
				getCommentID(function(err,commentID)
				{
					if (err)
					{
						callback(err);
					}
					else
					{	
						var ID = "com_" + commentID;
						
						var date = new Date();
						var timestamp = Date.now();
						
						db.hget("post_" + obj.postID, "lang",function(err,langValue)
						{
							if (!err && langValue)
							{
								//console.log("POST COMMENT getting lang from POST: " + langValue);
								
								var multi = db.multi();
								
								
								multi.hmset(ID,"ID",commentID,"name",obj.name,"content",obj.content,"email",obj.email,"date",timestamp,"valid",0,"postID",obj.postID);
								
								
								if (obj.answerComID)
								{
									var answerComID = parseInt(obj.answerComID);
									
									if (answerComID != -1)
									{								
										multi.hmset(ID,"answerComID",parseInt(obj.answerComID));
									}
								}
								
								
								if (obj.emailOnAnswer && obj.email != "")
								{
									multi.hmset(ID,"emailOnAnswer",1);
								}
								
								
								if (obj.gravatar)
								{
									multi.hmset(ID,"gravatar",obj.gravatar);
								}

								if (obj.twitter)
								{
									multi.hmset(ID,"twitter",obj.twitter);
								}

								if (obj.website)
								{
									multi.hmset(ID,"website",obj.website);
								}

	
								// comment will be link to the post later, when validated
								//multi.zadd("comments_" + obj.postID,timestamp,ID); // ordered set for each post
								
								multi.zadd("comments_all_" + langValue,timestamp,ID); // all comments (to list in admin)
								multi.zadd("comments_unvalidated_" + langValue,timestamp,ID); // unvalidated comments (to list in admin)
								
								multi.incr("commentCount");
								
								multi.exec(function(err,replies)
								{
									if (err)
									{
										callback(err);	 
									}
									else
									{
										callback();	 
									}
								});
								
							}
							else // old way, using session lang
							{
								// console.log("POST COMMENT getting lang from SESSION: " + lang_module.get(req));
								
								var multi = db.multi();
								
								multi.hmset(ID,"ID",commentID,"name",obj.name,"content",obj.content,"email",obj.email,"date",timestamp,"valid",0,"postID",obj.postID);
								
								if (obj.answerComID && parseInt(obj.answerComID) != -1)
								{
									var answerComID = parseInt(obj.answerComID);
									
									if (answerComID != -1)
									{								
										multi.hmset(ID,"answerComID",parseInt(obj.answerComID));
									}
								}
								
								
								if (obj.emailOnAnswer && obj.email != "")
								{
									multi.hmset(ID,"emailOnAnswer",1);
								}
								
								
								if (obj.gravatar)
								{
									multi.hmset(ID,"gravatar",obj.gravatar);
								}

								if (obj.twitter)
								{
									multi.hmset(ID,"twitter",obj.twitter);
								}

								if (obj.website)
								{
									multi.hmset(ID,"website",obj.website);
								}
								
								
								
								// comment will be link to the post later, when validated
								//multi.zadd("comments_" + obj.postID,timestamp,ID); // ordered set for each post
								
								multi.zadd("comments_all_" + lang_module.get(req),timestamp,ID); // all comments (to list in admin)
								multi.zadd("comments_unvalidated_" + lang_module.get(req),timestamp,ID); // unvalidated comments (to list in admin)
								
								multi.incr("commentCount");
								
								multi.exec(function(err,replies)
								{
									if (err)
									{
										callback(err);	 
									}
									else
									{
										callback();	 
									}
								});
							}
						});
					}
				});
			}
			else
			{
				callback({"error":"Post can't be found"});	
			}
		}
	});
}


var list = function(req,page,nbPostsPerPage,callback)
{	
	var content = [];
	
	var lang;
	
	if (req.params.lang)
		lang = req.params.lang;
	else
		lang = lang_module.get(req);
		
	
	db.zrevrange('posts_' + lang, page * nbPostsPerPage, page * nbPostsPerPage + (nbPostsPerPage - 1) ,function(error, keys)
	{
	if (error)
	{
		callback(true,content);
	}
	else
	{
		var multi = db.multi();
		
		keys.forEach(function (key)
		{
			multi.hgetall(key);
		});
		
		multi.exec(function(err,replies)
		{
			replies.forEach(function(post)
			{
				post.stringdate = getPostTime(req,post.date);
				post.blocks = JSON.parse(post.blocks);
			});
					
			callback(null,replies);
		});
			
			
	}
	});
}






 
var listComments = function(req,page,nbCommentsPerPage,callback)
{	
	var content = [];

	db.zrevrange('comments_all_' + lang_module.get(req), page * nbCommentsPerPage, page * nbCommentsPerPage + (nbCommentsPerPage - 1) ,function(error, keys)
	{
		if (error)
		{
			callback(true,content);
		}
		else
		{	
			var multi = db.multi();
			
			keys.forEach(function (key)
			{
				multi.hgetall(key);			
			});
			
			multi.exec(function(err,replies)
			{
				replies.forEach(function(comment)
				{
					comment.date = getPostTime(req,comment.date);
				});
						
				callback(null,replies);
			});
		}
	});
}



var listUnvalidatedComments = function(req,page,nbCommentsPerPage,callback)
{	
	var content = [];

	db.zrevrange('comments_unvalidated_' + lang_module.get(req), page * nbCommentsPerPage, page * nbCommentsPerPage + (nbCommentsPerPage - 1) ,function(error, keys)
	{
		if (error)
		{
			callback(true,content);
		}
		else
		{	
			var multi = db.multi();
			
			keys.forEach(function (key)
			{
				multi.hgetall(key);			
			});
			
			multi.exec(function(err,replies)
			{
				replies.forEach(function(comment)
				{
					comment.date = getPostTime(req,comment.date);
				});
						
				callback(null,replies);
			});
		}
	});
}





var acceptComment = function(req,res)
{
	var ID = "com_" + req.body.ID;
	
	db.hmget(ID,"postID","date",function(error,values)
	{
		if (!error && values)
		{
			var postID = values[0];
			var date = values[1];
			
			var multi = db.multi();
			multi.zrem("comments_unvalidated_" + lang_module.get(req),ID);
			multi.zadd("comments_" + postID,date,ID); // ordered set for each post
			multi.hset(ID,"valid",1);
			multi.hincrby("post_" + postID,"nbComs",1);
			multi.exec(function(error,values)
			{
				if (!error)
				{
					var ret = {"success":true};
					tools.returnJSON(res,ret);


					// maybe an email has to be sent if answering comment

					console.log("comment accepted, maybe we should send an email?");
					sendEmailOnAnswer(ID);

				}
				else
				{
					var ret = {"success":false};
					tools.returnJSON(res,ret);
				}
			});
		}
		else
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 	
		}
	});
}



var deleteComment = function(req,res)
{
	var ID = "com_" + req.body.ID;
	
	db.hmget(ID,"postID","valid",function(error,values)
	{
		if (!error && values)
		{
			var postID = values[0];
			var valid = (values[1] == 1);
			
			var multi = db.multi();
			multi.zrem("comments_unvalidated_" + lang_module.get(req),ID);
			multi.zrem("comments_all_" + lang_module.get(req),ID);
			multi.zrem("comments_" + postID,ID); // ordered set for each post
			
			// only if comment was attached to the post (validated)
			if (valid)
			{
				multi.hincrby("post_" + postID,"nbComs",-1);
			}
			
			multi.exec(function(error,values)
			{
				if (!error)
				{
					var ret = {"success":true};
					tools.returnJSON(res,ret);
				}
				else
				{
					var ret = {"success":false};
					tools.returnJSON(res,ret);
				}
			});
		}
		else
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 	
		}
	});
}



var deletePost = function(req,res)
{
	var ID = req.body.ID;
	var POST_ID = "post_" + ID;
	
	db.hmget(POST_ID,"lang",function(error,values)
	{
		if (!error)
		{
			var lang = values[0];
			
			if (lang)
			{	
				db.zrange('comments_' + ID, 0, -1 ,function(err, keys)
				{	
					if (err)
					{
						callback(err);
					}
					else
					{	
						var multi = db.multi();
						
						keys.forEach(function(key)
						{								
							multi.zrem("comments_unvalidated_" + lang,key);
							multi.zrem("comments_all_" + lang,key);
							multi.zrem("comments_" + ID,key);
						});
						
						multi.zrem("posts_" + lang,POST_ID);
						
						multi.del(POST_ID);
												
						multi.exec(function(err,replies)
						{
							if (!error)
							{
								var ret = {"success":true};
								tools.returnJSON(res,ret);
							}
							else
							{
								var ret = {"success":false};
								tools.returnJSON(res,ret);
							}
						});
					}
					
				}); 	
			}
			else
			{
				var ret = {"success":false};
				tools.returnJSON(res,ret); 	
			}
		}
		else
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 	
		}
	});
}



var deletePage = function(req,res)
{
	var ID = req.body.ID;
	var POST_ID = "post_" + ID;
	
	db.hgetall("pages_"+ lang_module.get(req),function(error,values)
	{
		if (!error)
		{			
			var multi = db.multi();
			
			Object.keys(values).forEach(function(val,key)
			{	
				var pID = values[val];
				var parts = pID.split("_");
				var postid = parts[parts.length-1];
				
				if (postid == ID)
				{	
					multi.hdel("pages_" + lang_module.get(req),val);
					multi.del(POST_ID);
				}
			});
			
			multi.exec(function(err,replies)
			{
				if (!error)
				{
					var ret = {"success":true};
					tools.returnJSON(res,ret);
				}
				else
				{
					var ret = {"success":false};
					tools.returnJSON(res,ret);
				}
			});
		}
		else
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 	
		}
	});
}




var get = function(req,postID,callback)
{	
	db.hgetall("post_" + postID,function(error,post)
	{
		if (error || !post)
		{
			callback(true);
		}
		else
		{	
			if (post.blocks)
			{	
				//console.log(post.blocks);
				post.blocks = JSON.parse(post.blocks);
				post.stringdate = getPostTime(req,post.date);	
				callback(false,post);
			}
			else
			{
				callback(true);
			}
		}
	});
}


var pages = function(req,nbPostsPerPage,callback)
{
	var pages = 0;
  
	var lang;
	
	if (req.params.lang)
		lang = req.params.lang;
	else
		lang = lang_module.get(req);
	
	
	db.zcard('posts_' + lang,function(error,nbPosts)
	{
		if (error)
		{
		// error
		}         
		else
		{
			pages = Math.floor(nbPosts / nbPostsPerPage) + (nbPosts % nbPostsPerPage > 0 ? 1 : 0);
		}
	
		callback(pages);
	});
}






// this method should only be called by admin module
// I don't know if there's a way to lock that

var newPost = function(req,res)
{ 
	getPostID(function(err,postID)
	{
		if (err)
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 
		}
		else
		{
			var ID = "post_" + postID;
			
			var date = new Date();
			var timestamp = Date.now();// / 1000;
			
			var post = {};
			post.blocks = req.body.blocks;
			post.title = req.body.postTitle;
			
			var slugURL = slug(post.title).toLowerCase();						

			
			var multi = db.multi();
			
			multi.hmset(ID,"blocks",JSON.stringify(post.blocks),"date",timestamp,"ID",postID,"nbComs",0,"slug",slugURL,"title",post.title,"lang",lang_module.get(req));
			multi.zadd("posts_" + lang_module.get(req),timestamp,ID); // ordered set for each lang
			multi.incr("postCount");
			
			multi.exec(function(err,replies)
			{
				if (err)
				{
					var ret = {"success":false};
					tools.returnJSON(res,ret); 
				}
				else
				{
					var ret = {"success":true};
					tools.returnJSON(res,ret); 
				}
			});
		}
	});
}



var saveEditedPost = function(req,res)
{ 
	var postID = req.body.ID;
	
	var ID = "post_" + postID;
	
	var date = new Date();
	var timestamp = Date.now();// / 1000;
	
	var post = {};
	post.blocks = req.body.blocks;
	post.title = req.body.postTitle;
	
	var slugURL = slug(post.title).toLowerCase();
	
	var multi = db.multi();
	
	multi.hmset(ID,"blocks",JSON.stringify(post.blocks),"update",timestamp,"slug",slugURL,"title",post.title);
	
	multi.exec(function(err,replies)
	{
		if (err)
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 
		}
		else
		{
			var ret = {"success":true};
			tools.returnJSON(res,ret); 
		}
	});

  
}









// takes a post ID in parameter
var editPost = function(req,res)
{ 
  var postID = req.params.postID;

  db.hgetall("post_" + postID,function(error,content)
  {
    if (error)
    {
      tools.returnJSON(res,{"success":false,"error":error});
    }
    else
    {
      content.stringdate = getPostTime(req,content.date);
	  content.blocks = JSON.parse(content.blocks);

      tools.renderJade(req,res,'admin_post_edit',{ siteName: 'Blog | Admin - Edit post',
      post: content
      });
    }
  });
}




module.exports = {
	app: app,
	list: list,
	pages: pages,
	get: get,
	newPost: newPost,
	saveEditedPost: saveEditedPost,
	editPost: editPost,
	listComments: listComments,
	acceptComment : acceptComment,
	deleteComment : deleteComment,
	
	deletePost : deletePost,
	deletePage : deletePage,
	
	renderPosts2 : renderPosts2
}


function formatWebsite(website)
{
	if (website != "")
	{
		website = website.trim();

		if (website.substring(0,7) != "http://" && website.substring(0,8) != "https://")
		{
			website = "http://" + website;
		}
		
		return website;
	}
	else
	{
		return "";
	}
}


function validateWebsite(website) 
{
    return (website.length <= 255) && (website != "");
}

function formatTwitter(twitter)
{
	if (twitter != "")
	{
		// in case user entered adress such as https://twitter.com/a_duermael
		var parts = twitter.split("/");
		twitter = parts[parts.length-1];

		// In case user entered the '@', "@a_duermael"
		twitter = twitter.replace('@','');

		twitter = twitter.trim();

		return twitter;
	}
	else
	{
		return "";
	}
}

function validateTwitter(twitter) 
{
    return (twitter.length <= 20) && (twitter != "");
}

function validateEmail(email) 
{
    var re = /\S+@\S+\.\S+/;
    return re.test(email);
}


function getPostID(callback)
{
  db.get("postCount",function(err,postCount)
  {
    var postID = 0;

    if (postCount)
    {
      postID = postCount;
    }
    
    callback(err,postID);
  });
}

function getCommentID(callback)
{
  db.get("commentCount",function(err,commentCount)
  {
	var commentID = 0;
	
	if (!err && commentCount)
	{
	  commentID = commentCount;
	}
	
	callback(err,commentID);
  });
}



var SECOND = 1;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE;
var DAY = 24 * HOUR;
var MONTH = 30 * DAY;
var YEAR = 365 * DAY;

var LOC_notYet = ["post from the future","un post du futur"];
var LOC_oneSecond = ["one second ago","il y a une seconde"];
var LOC_seconds = ["{0} seconds ago","il y a {0} secondes"];
var LOC_oneMinute = ["a minute ago","il y a une minute"];
var LOC_minutes = ["{0} minutes ago","il y a {0} minutes"];
var LOC_oneHour = ["an hour ago","il y a une heure"];
var LOC_hours = ["{0} hours ago","il y a {0} heures"];
var LOC_yesterday = ["yesterday","hier"];
var LOC_days = ["{0} days ago","il y a {0} jours"];
var LOC_oneMonth = ["one month ago","il y a un mois"];
var LOC_months = ["{0} months ago","il y a {0} mois"];
var LOC_oneYear = ["one year ago","il y a un an"];
var LOC_years = ["{0} years ago","il y a {0} ans"];

if (!String.prototype.format)
{
	String.prototype.format = function()
	{	
		var args = arguments;
		var sprintfRegex = /\{(\d+)\}/g;
		
		var sprintf = function (match, number)
		{
			return number in args ? args[number] : match;
		};
		
		return this.replace(sprintfRegex, sprintf);
	};
}

  

function getPostTime(req,gmt)
{
	var lang = lang_module.get(req);
	
	var date = new Date();
	var now = Date.now()  
	
	delta = Math.floor((now - gmt) / 1000);
	
	
	var l = lang == "fr" ? 1 : 0;
	
	if (delta < 0)
	{
		return LOC_notYet[l]; 
	}
	if (delta < 1 * MINUTE)
	{
		return delta == 1 ? LOC_oneSecond[l] : LOC_seconds[l].format(delta);
	}
	else if (delta < 2 * MINUTE)
	{
		return LOC_oneMinute[l];
	}
	else if (delta < 60 * MINUTE)
	{
		var minutes = Math.floor(delta / MINUTE);
		return LOC_minutes[l].format(minutes);  
	}
	else if (delta < 2 * HOUR)
	{
		return LOC_oneHour[l];
	}
	else if (delta < 24 * HOUR)
	{
		var hours = Math.floor(delta / HOUR);
		return LOC_hours[l].format(hours);
	}
	else if (delta < 48 * HOUR)
	{
		return LOC_yesterday[l];
	}
	else if (delta < 30 * DAY)
	{
		var days = Math.floor(delta / DAY);
		return LOC_days[l].format(days);
	}
	else if (delta < 12 * MONTH)
	{
		var months = Math.floor(delta/MONTH);
		return months <= 1 ? LOC_oneMonth[l] : LOC_months[l].format(months);
	}
	else
	{
		var years = Math.floor(delta/YEAR);
		return years <= 1 ? LOC_oneYear[l] : LOC_years[l].format(years);
	}
}



