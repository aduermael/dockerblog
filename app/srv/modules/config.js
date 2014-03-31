var db = require('./db').connect();

var tools = require('./tools');


module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.post('/key', add );
	app.get('/:lang', page );	

	
	return app;
	
}();


function page(req,res)
{
	var lang = req.params.lang;
	tools.renderJade(res,'admin_config',{ siteName: 'Blog | Admin - Config',lang:lang });
}

function get(lang,callback)
{
  db.get('config_' + lang,function(error,json)
  {
    if (error)
    {
      callback();
    }
    else
    {
      var obj = JSON.parse(json);
      callback(obj);
    }
  });
}


function set(lang,value,key,callback)
{
  db.get('config_' + lang,function(error,json)
  {
    if (error)
    {
      callback();
    }
    else
    {
      var obj = JSON.parse(json);
      obj[key] = value;

      var multi = db.multi();
      multi.set('config_' + lang,JSON.stringify(obj));

      multi.exec(function(err,replies)
      {
        if (err)
        {
          callback(JSON.parse(json));
        }
        else
        {
          callback(obj);
        }
      });
    }
  });
}



function add(req,res)
{
	var key = req.body.key;
	var lang = req.body.lang;
	
	
	db.hset('config_' + lang,key,"empty",function(error,reply)
	{
		if (!error)
		{
			if (reply == 1)
			{
				console.log("config: new key");
			}
			else
			{
				console.log("config: updated key");
			}
			
			 var ret = {"success":true};
			 tools.returnJSON(res,ret)
		}
		else
		{
			 var ret = {"success":false};
			 tools.returnJSON(res,ret)
		}
	});
}



function del(lang,key,callback)
{
	db.hdel('config_' + lang,key,function(error,nbRemoved)
	{
		
	});
}





