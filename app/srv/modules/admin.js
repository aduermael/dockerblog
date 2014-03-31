var express = require('express');
var app = express();

var postsManager = require('./posts');

var tools = require('./tools');


exports.app = function()
{
  app.use(express.basicAuth('admin', 'admin'));
  
  app.use('/config', require('./config') );

  app.get('/new', newPost );
  app.get('/posts/:lang',posts);

  app.post('/new', saveNewPost);
  app.post('/edit', saveEditedPost);

  app.get('/edit/:postID', editPost );

  app.get('*',home);

  return app;
}();


function home(req,res)
{
	tools.renderJade(res,'admin_post',{ siteName: 'Blog | Admin - New post' });
}


function newPost(req,res)
{
	tools.renderJade(res,'admin_post',{ siteName: 'Blog | Admin - New post' });
}



// TO MOVE 

function saveNewPost(req,res)
{
  postsManager.newPost(req,res);
}

// TO MOVE 

function editPost(req,res)
{
  postsManager.editPost(req,res);
}

// TO MOVE 

function saveEditedPost(req,res)
{
  postsManager.saveEditedPost(req,res);
}






function posts(req,res)
{
  var lang = req.params.lang;
  // getPosts(lang,0,100,function(error,content) 
  postsManager.list(lang,0,100,function(error,content)
  {
      tools.renderJade(res,'admin_posts',{ siteName: 'Blog | Admin',
          posts: content,
          lang: lang });
  });
};






