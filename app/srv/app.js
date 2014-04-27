var redis = require('redis');
var express = require('express');
var crypto = require('crypto');


var postsManager = require('./modules/posts');

var lang = require('./modules/lang');

var filesManager = require('./modules/files');
filesManager.init(__dirname + "/public");

var adminManager = require('./modules/admin');


var postsPerPage = 10;


function myInfos()
{
  if (lang.is("fr"))
  {
    return "Je suis une dessinatrice de BD installée en Californie. Je travaille aussi pour des jeux vidéos."; 
  }
  else
  {
    return "Comic book artist and iPhone/iPad game designer, in San Francisco.";
  }
}

function facebookLink()
{
  if (lang.is("fr"))
  {
    return "https://www.facebook.com/LaurelComics"; 
  }
  else
  {
    return "https://www.facebook.com/LaurelComics"; 
  }
}

function twitterLink()
{
  if (lang.is("fr"))
  {
    return "https://twitter.com/bloglaurel"; 
  }
  else
  {
    return "https://twitter.com/laurelcomics"; 
  }
}


var client = redis.createClient();

var app = express();

app.use(express.compress());
app.use(express.cookieParser());

app.use(express.bodyParser({ uploadDir:__dirname + '/uploads' }));
app.use(express.static(__dirname + '/public'));

app.use('/admin', adminManager.app);

app.use('/lang', lang.app);
app.use(lang.use);

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

var files_dir = __dirname + "/public/files";



// SHOULD BE ONLY CALL IN /ADMIN
app.post('/image', function (req, res)
{
  filesManager.saveFile(req,res);
});





app.get('/page:PageID', renderPosts);
app.get('/post:PostID', renderPost);

app.get('*',renderPosts);




function renderPosts(req,res)
{
	var page = req.params.PageID;
	if (!page) page = 1;
	
	postsManager.list(lang.get(), (page - 1) , postsPerPage , function(error,content)
	{
		postsManager.pages(lang.get(), postsPerPage ,function(nbPages)
		{
			res.render('posts',{ siteName: 'Blog | Home',
			posts: content,
			lang: lang.get(),
			myInfos: myInfos(),
			fbLink: facebookLink(),
			twLink: twitterLink(),
			pages: nbPages });
		});
	});
}



function renderPost(req,res)
{
	var postID = req.params.PostID;
	
	postsManager.get(postID, function(error,post)
	{	
		res.render('post',
		{
			siteName: 'Blog | post',
			post: post,
			lang: lang.get(),
			myInfos: myInfos(),
			fbLink: facebookLink(),
			twLink: twitterLink()
		});
	});
}




function end(res,data)
{
  var body = JSON.stringify(data);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', body.length);
  res.end(body);
}

var port = 80;

app.listen(port, function() {
  console.log("Listening on " + port);
});


