var db = require('./db').connect();

var tools = require('./tools');

var lang = require('./lang');



module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.post('/key', add );
	app.get('/', page );	

	
	return app;
	
}();


function page(req,res)
{	
	db.hgetall('config_' + lang.get(),function(error,values)
	{
		if (!error)
		{
			var options = {};
			options.siteName = 'Blog | Admin - Config';
			options.lang = lang.get();
			if (values)
				options.prefs = values;
			else
				options.prefs = [];
			
			
			console.log(JSON.stringify(options));
			
			tools.renderJade(res,'admin_config',options);	
		}
		
	});
}




function get(callback)
{
  db.get('config_' + lang.get(),function(error,json)
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


function set(value,key,callback)
{
  db.get('config_' + lang.get(),function(error,json)
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
      multi.set('config_' + lang.get(),JSON.stringify(obj));

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
	
	
	db.hset('config_' + lang.get(),key,"empty",function(error,reply)
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



function del(key,callback)
{
	db.hdel('config_' + lang.get(),key,function(error,nbRemoved)
	{
		
	});
}





