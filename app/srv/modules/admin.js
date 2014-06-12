//
// Dockerblog
//
//


// import GLOBAL modules
var express = require('express');
var auth = require('basic-auth');

// import LOCAL modules
var postsManager = require('./posts');
var pagesManager = require('./pages');
var tools = require('./tools');
var lang = require('./lang');
var files = require('./files');

var db = require('./db').connect();


var app = express();

app.set('views', GLOBAL.views_dir_path);
app.set('view engine', 'jade');
	
	
module.exports = function()
{
	// http basic auth middleware
	app.use(authentication);

	app.use('/lang', lang.app);
	app.use(lang.use);

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

	app.post('/new', saveNewPost);
	app.post('/edit', saveEditedPost);

	app.get('/edit/:postID', editPost );
	app.get('/pages/edit/:pageID', editPage );

	
	app.post('/image', function (req, res)
	{
		files.saveFile(req,res);
	});
	
	
	app.post('/credentials', updateCredentials);


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
		// get from DB
		db.hmget("blog_credentials","login","pass",function(err,values)
		{
			if (!err)
			{
				var login = values[0];
				var passHash = values[1];
				
				if (login && passHash)
				{
					console.log("login: " + login + " pass: " + pass);
					
					if (result.name == login && tools.sha1(result.pass,"w;0S9f;9O!1gI6w26*4dfB.&UA=E?9") == passHash)
					{
						console.log("authentication -> OK");
					}
					else
					{
						console.log("authentication -> NO");
					}					
				}
				else
				{
					// admin / admin
					console.log("missing login & pass in DB -> admin/admin");
				}
			}	
		});
		
		
		if (result.name == 'admin' && result.pass == 'admin')
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



function updateCredentials(req,res)
{
	var login = req.body.login;
	var loginVerif = req.body.loginVerif;
	
	var pass = req.body.pass;
	var passVerif = req.body.passVerif;
	
	if (login != "" && login == loginVerif && pass != "" && pass == passVerif)
	{
		var passHash = tools.sha1(pass,"w;0S9f;9O!1gI6w26*4dfB.&UA=E?9");
			
		db.hmset("blog_credentials","login",login,"pass",passHash,function(err)
		{
			if (!err)
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
}



function home(req,res)
{
	tools.renderJade(res,'admin_post',{ siteName: 'Blog | Admin - New post', lang: lang.get() });
}


function newPost(req,res)
{
	tools.renderJade(res,'admin_post',{ siteName: 'Blog | Admin - New post', lang: lang.get() });
}


function newPage(req,res)
{
	tools.renderJade(res,'admin_page',{ siteName: 'Blog | Admin - New page', lang: lang.get() });
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
  postsManager.list(0,200,function(error,content)
  {
      tools.renderJade(res,'admin_posts',{ siteName: 'Blog | Admin',
          posts: content,
          lang: lang.get() });
  });
};


function pages(req,res)
{
  pagesManager.list(0,200,function(error,content)
  {
      tools.renderJade(res,'admin_pages',{ siteName: 'Blog | Admin',
          pages: content,
          lang: lang.get() });
  });
};


function comments(req,res)
{
  postsManager.listComments(0,200,function(error,content)
  {
      tools.renderJade(res,'admin_comments',{ siteName: 'Blog | Admin - Comments',
          comments: content,
          lang: lang.get() });
  });
};






