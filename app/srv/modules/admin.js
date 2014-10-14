//
// Dockerblog
//
//


// import GLOBAL modules
var express = require('express');
var auth = require('basic-auth');
var fs = require('fs');

// import LOCAL modules
var postsManager = require('./posts');
var pagesManager = require('./pages');
var tools = require('./tools');
var lang_module = require('./lang');
var files = require('./files');

var LOGIN = "";
var PASSHASH = "";




var db = require('./db').connect();


var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');
	
	
module.exports = function()
{
	// http basic auth middleware
	app.use(authentication);

	app.use('/lang', lang_module.app);
	app.use(lang_module.use);

	// admin "keys" tab
	app.use('/keys', require('./keys'));
	// admin "config" tab
	app.use('/config', require('./config'));

	app.get('/new', newPost );
	app.get('/posts',posts);
	
	app.get('/pages/new', newPage );
	app.get('/pages',pages);
	
	app.post('/pages/new', saveNewPage);
	app.post('/pages/edit', saveEditedPage);
	
	app.get('/comments',comments);
	app.post('/acceptComment',postsManager.acceptComment);
	app.post('/deleteComment',postsManager.deleteComment);
	
	app.post('/deletePost',postsManager.deletePost);
	app.post('/deletePage',postsManager.deletePage);

	app.post('/new', saveNewPost);
	app.post('/edit', saveEditedPost);

	app.get('/edit/:postID', editPost );
	app.get('/pages/edit/:pageID', editPage );

	
	app.post('/image', function (req, res)
	{
		files.saveFile(req,res);
	});
	
	
	app.post('/credentials', updateCredentials);

	app.post('/emailcredentials', updateEmailCredentials);


	app.get('*',posts);

	return app;
}();



//
// [MIDDLEWARE]
// author : gaetan
// note   : this is to be moved to a clean module!!
// help to do the module : https://github.com/expressjs/basic-auth-connect/blob/master/index.js
//
function authentication(req, res, next)
{	
	var result = auth(req);
	//console.log('result is '+JSON.stringify(result));
	
	// is 'result' is undefined, it means the authentication has failed
	// (authentication header fields are not present)
	if (result == undefined)
	{
		// Respond with 401 "Unauthorized".
		res.statusCode = 401;
		res.setHeader('WWW-Authenticate', 'Basic realm="Authorization Required"');
		res.end('Unauthorized');
	}
	else
	{
		if (LOGIN == "" && PASSHASH == "")
		{
			// get from DB
			db.hmget("blog_credentials","login","pass",function(err,values)
			{
				if (!err)
				{
					var login = values[0];
					var passHash = values[1];
					
					if (login && passHash)
					{
						LOGIN = login;
						PASSHASH = passHash;
						
						if (result.name == LOGIN && tools.sha1(result.pass) == PASSHASH)
						{
							console.log("authentication -> OK");
							next();
						}
						else
						{
							console.log("authentication -> NO");
	
							// Respond with 401 "Unauthorized".
							res.statusCode = 401;
							res.setHeader('WWW-Authenticate', 'Basic realm="Authorization Required"');
							res.end('Unauthorized');
						}					
					}
					else
					{
						// admin / admin
						console.log("missing login & pass in DB -> admin/admin");
						
						LOGIN = "admin";
						PASSHASH = tools.sha1("admin");
						
						if (result.name == LOGIN && tools.sha1(result.pass) == PASSHASH)
						{
							next();
						}
						else
						{
							// Respond with 401 "Unauthorized".
							res.statusCode = 401;
							res.setHeader('WWW-Authenticate', 'Basic realm="Authorization Required"');
							res.end('Unauthorized');
						}
					}
				}	
			}); // end get from DB	
		}
		else // LOGIN & PASSHASH already retrieved from DB
		{
			if (result.name == LOGIN && tools.sha1(result.pass) == PASSHASH)
			{
				console.log("authentication -> OK");
				next();
			}
			else
			{
				console.log("authentication -> NO");

				// Respond with 401 "Unauthorized".
				res.statusCode = 401;
				res.setHeader('WWW-Authenticate', 'Basic realm="Authorization Required"');
				res.end('Unauthorized');
			}
		}
	
		
	}
}



function updateCredentials(req,res)
{
	var login = req.body.login;
	var loginVerif = req.body.loginVerif;
	
	var pass = req.body.pass;
	var passVerif = req.body.passVerif;
	
	LOGIN = "";
	PASSHASH = "";
	
	if (login != "" && login == loginVerif && pass != "" && pass == passVerif)
	{					
		var passHash = tools.sha1(pass);
			
		db.hmset("blog_credentials","login",login,"pass",passHash,function(err)
		{
			if (!err)
			{
				console.log("passHash: " + passHash);
				
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
}





function updateEmailCredentials(req,res)
{
	// like Gmail
	// https://github.com/andris9/nodemailer-wellknown#supported-services

	var service = req.body.service;
	var login = req.body.login;	
	var pass = req.body.pass;

	if (login != "" && pass != "" && service != "")
	{					
		var passHash = tools.sha1(pass);
			
		var config = {};
		config.service = service;
		config.auth = {};
		config.auth.user = login;
		config.auth.pass = pass;

		fs.writeFile( GLOBAL.private_dir_path + '/email_config.json', JSON.stringify(config), function (err)
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

				tools.deleteMailTransporter();
			}
		});	
	}
	else
	{
		var ret = {"success":false};
		tools.returnJSON(res,ret);
	}
}





function home(req,res)
{
	tools.renderJade(req,res,'admin_post',{ siteName: 'Blog | Admin - New post', lang: lang_module.get(req) });
}


function newPost(req,res)
{
	tools.renderJade(req,res,'admin_post',{ siteName: 'Blog | Admin - New post', lang: lang_module.get(req) });
}


function newPage(req,res)
{
	tools.renderJade(req,res,'admin_page',{ siteName: 'Blog | Admin - New page', lang: lang_module.get(req) });
}



// TO MOVE 

function saveNewPost(req,res)
{
  postsManager.newPost(req,res);
}


function saveNewPage(req,res)
{
  pagesManager.newPage(req,res);
}


// TO MOVE 

function editPost(req,res)
{
	postsManager.editPost(req,res);
}

function editPage(req,res)
{
	pagesManager.editPage(req,res);
}

// TO MOVE 

function saveEditedPost(req,res)
{
  postsManager.saveEditedPost(req,res);
}

function saveEditedPage(req,res)
{
  pagesManager.saveEditedPage(req,res);
}



function posts(req,res)
{
  postsManager.list(req,0,200,function(error,content)
  {
      tools.renderJade(req,res,'admin_posts',{ siteName: 'Blog | Admin',
          posts: content,
          lang: lang_module.get(req) });
  });
};


function pages(req,res)
{
  pagesManager.list(req,0,200,function(error,content)
  {
      tools.renderJade(req,res,'admin_pages',{ siteName: 'Blog | Admin',
          pages: content,
          lang: lang_module.get(req) });
  });
};


function comments(req,res)
{
  postsManager.listComments(req,0,200,function(error,content)
  {
      tools.renderJade(req,res,'admin_comments',{ siteName: 'Blog | Admin - Comments',
          comments: content,
          lang: lang_module.get(req) });
  });
};






