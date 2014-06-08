var slug = require('slug');
var langManager = require('./lang');
var tools = require('./tools');
var db = require('./db').connect();

var pagesPerpage = 200;



var app = function()
{
	var express = require('express');
	var app = express();

	app.get('/:pageName', renderPage );

	return app;
}();




function renderPage(req,res,next)
{	
	var pageName = req.params.pageName;
	
	console.log("test page: " + pageName);
	
	db.hget("pages_" + langManager.get(),pageName,function(err,pageID)
	{
		if (!err && pageID)
		{
			get(pageID, function(error,page)
			{
				if (!error)
				{
					tools.renderJade(res,'page',
					{
						siteName: 'Blog | page',
						page: page,
						lang: langManager.get()
					});
				}
				else
				{
					console.log("error getting page");
					next();
				}
			});
		}
		else
		{
			console.log("page not found");
			next();
		}
	});
	
	
}



var list = function(page,nbpagesPerpage,callback)
{	
	db.hvals("pages_" + langManager.get(),function(err,IDs)
	{
		var multi = db.multi();
		
		IDs.forEach(function (pageID)
		{
			multi.hgetall(pageID);
		});
		
		multi.exec(function(err,replies)
		{
			replies.forEach(function(page)
			{
				page.date = getPostTime(page.date);
				page.blocks = JSON.parse(page.blocks);
			});
					
			callback(null,replies);
		});
	});
}



var get = function(pageID,callback)
{
	db.hgetall(pageID,function(error,page)
	{
		if (error || !page)
		{
			callback(true);
		}
		else
		{			
			page.blocks = JSON.parse(page.blocks);
			page.stringdate = getPostTime(page.date);	
			callback(false,page);
		}
	});
}


var pages = function(nbpagesPerpage,callback)
{
  var pages = 0;

  db.zcard('pages_' + langManager.get(),function(error,nbPages)
  {
    if (error)
    {
      // error
    }         
    else
    {
      pages = Math.floor(nbPages / nbpagesPerpage) + (nbPages % nbpagesPerpage > 0 ? 1 : 0);
    }

    callback(pages);
  });
}






// this method should only be called by admin module
// I don't know if there's a way to lock that

var newPage = function(req,res)
{ 
	getPageID(function(err,pageID)
	{
		if (err)
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 
		}
		else
		{
			var ID = "page_" + pageID;
			
			var date = new Date();
			var timestamp = Date.now();// / 1000;
			
			var page = {};
			page.blocks = req.body.blocks;
			page.name = slug(req.body.pageName).toLowerCase();
			page.title = req.body.pageTitle;
			
			var multi = db.multi();
			
			multi.hmset(ID,"blocks",JSON.stringify(page.blocks),"date",timestamp,"ID",pageID,"name",page.name,"title",page.title);
			multi.hset("pages_" + langManager.get(),page.name,ID); // ordered set for each lang
			multi.incr("pageCount");
			
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



var saveEditedPage = function(req,res)
{ 
	var pageID = req.body.ID;
	
	var ID = "page_" + pageID;
	
	var date = new Date();
	var timestamp = Date.now();// / 1000;
	
	var page = {};
	page.blocks = req.body.blocks;
	page.name = slug(req.body.pageName).toLowerCase();
	page.title = req.body.pageTitle;
	
	db.hget(ID,"name",function(err,oldPageName)
	{
		if (!err)
		{
			var multi = db.multi();
		
			multi.hmset(ID,"blocks",JSON.stringify(page.blocks),"update",timestamp,"ID",pageID,"name",page.name,"title",page.title);
			multi.hdel("pages_" + langManager.get(),oldPageName);
			multi.hset("pages_" + langManager.get(),page.name,ID); // ordered set for each langManager
			
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
		else
		{
			var ret = {"success":false};
			tools.returnJSON(res,ret); 
		}
			
	});
	
	

  
}



// takes a post ID in parameter
var editPage = function(req,res)
{ 
  var pageID = req.params.pageID;

  db.hgetall("page_" + pageID,function(error,content)
  {
    if (error)
    {
      tools.returnJSON(res,{"success":false,"error":error});
    }
    else
    {
      content.date = getPostTime(content.date);
	  content.blocks = JSON.parse(content.blocks);

      tools.renderJade(res,'admin_page_edit',{ siteName: 'Blog | Admin - Edit page',
      page: content,
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
	newPage: newPage,
	saveEditedPage: saveEditedPage,
	editPage: editPage,
}



function getPageID(callback)
{
  db.get("pageCount",function(err,pageCount)
  {
    var pageID = 0;

    if (pageCount)
    {
      pageID = pageCount;
    }
    
    callback(err,pageID);
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

  

function getPostTime(gmt)
{
	var lang = langManager.get();
	
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


