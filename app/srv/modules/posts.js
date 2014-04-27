var langManager = require('./lang');
var tools = require('./tools');

var db = require('./db').connect();

var postsPerPage = 10;


var app = function()
{
	var express = require('express');
	var app = express();

	app.get('/page:PageID', renderPosts );
	app.get('/post:PostID', renderOnePost );	
	app.get('*', renderPosts );	

	return app;
}();



function renderPosts(req,res)
{
	var page = req.params.PageID;
	if (!page) page = 1;
	
	list((page - 1) , postsPerPage , function(error,content)
	{
		pages(postsPerPage ,function(nbPages)
		{
			tools.renderJade(res,'posts',{ siteName: 'Blog | Home',
			posts: content,
			lang: langManager.get(),
			myInfos: "myInfos", // should be in key-value options
			fbLink: "facebookURL", // should be in key-value options
			twLink: "twitterURL", // should be in key-value options
			pages: nbPages });
		});
	});
}


function renderOnePost(req,res)
{
	var postID = req.params.PostID;
	
	get(postID, function(error,post)
	{	
		tools.renderJade(res,'post',
		{
			siteName: 'Blog | post',
			post: post,
			lang: langManager.get(),
			myInfos: "myInfos", // should be in key-value options
			fbLink: "facebookURL", // should be in key-value options
			twLink: "twitterURL" // should be in key-value options
		});
	});
}





var list = function(page,nbPostsPerPage,callback)
{	
	var content = [];
	
	db.zrevrange('posts_' + langManager.get(), page * nbPostsPerPage, page * nbPostsPerPage + (nbPostsPerPage - 1) ,function(error, keys)
	{
	if (error)
	{
		callback(true,content);
	}
	else
	{
		db.mget(keys,function(error,values)
		{
			if (error)
			{
				callback(true,content);
			}
			else
			{
				values.forEach(function (value)
				{
					var post = JSON.parse(value);
					post.stringdate = getPostTime(post.date,langManager.get());
					content.push(post);
				});
				
				callback(false,content);
			}
		});
	}
	});
}


var get = function(postID,callback)
{
	db.get("post_" + postID,function(error,value)
	{
		if (error)
		{
			callback(true,{});
		}
		else
		{			
			var post = JSON.parse(value);
			post.stringdate = getPostTime(post.date,langManager.get());	
			callback(false,post);
		}
	});
}


var pages = function(nbPostsPerPage,callback)
{
  var pages = 0;

  db.zcard('posts_' + langManager.get(),function(error,nbPosts)
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
  getPostID(function(postID)
  {
    var ID = "post_" + postID;

    var date = new Date();
    var timestamp = Date.now();// / 1000;
    
    var post = {};
    post.blocks = req.body.blocks;
    post.date = timestamp;
    post.ID = postID;

    var post_json = JSON.stringify(post);

    var multi = db.multi();
    multi.set(ID,post_json);
    multi.zadd("posts_" + post.lang,timestamp,ID); // ordered set for each lang

    if (postID > 0) multi.incr("postCount");
    else multi.set("postCount",1);

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
  });
}



var saveEditedPost = function(req,res)
{ 
  var ID = "post_" + req.body.ID;

  var date = new Date();
  var timestamp = Date.now();// / 1000;
  
  var post = {};
  post.blocks = req.body.blocks;
  post.date = timestamp;
  post.ID = req.body.ID;

  var post_json = JSON.stringify(post);

  var multi = db.multi();
  multi.set(ID,post_json);

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

  db.get("post_" + postID,function(error,value)
  {
    if (error)
    {
      tools.returnJSON(res,{"success":false,"error":error});
    }
    else
    {
      var content = JSON.parse(value);

      tools.renderJade(res,'admin_post_edit',{ siteName: 'Blog | Admin - Edit post',
      post: content,
      lang: langManager.get()
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
	editPost: editPost
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

    callback(postID);
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

  

function getPostTime(gmt,lang)
{
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



