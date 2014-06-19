//
// 
// KEYS
//
//

// import GLOBAL modules

// import LOCAL modules
var lang_module = require('./lang');
var db = require('./db').connect();
var tools = require('./tools');




module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.set('views', GLOBAL.views_dir_path);
	app.set('view engine', 'jade');
	
	app.post('/key', post_key );
	app.post('/delete_key', delete_key );
	app.get('/', root );	
	
	return app;	
}();



function root(req, res)
{
	// display the /admin/keys page
	db.hgetall('keys_' + lang_module.get(req), function(error, value)
	{
		if (!error)
		{
			var options = {};
			options.siteName = 'Blog | Admin - Keys (kvs)';
			options.lang = lang_module.get(req);
			options.prefs = value ? value : [];
			//console.log(JSON.stringify(options));			
			tools.renderJade(req,res, 'admin_keys', options);	
		}
	});
}



function post_key(req, res)
{
	console.log('POST KEY '+JSON.stringify(req.body));
	
	var key   = req.body.key;
	var value = req.body.value;
		
	if (key)
	{
		if (value)
		{
			if (lang_module.get(req))
			{
				setValueForKey(req,value,key,function(error) 
				{
					if (!error)
					{
						var response = {};
						response.success = true;
						tools.returnJSON(res, response)
					}
					else
					{
						var response = {};
						response.success = false;
						tools.returnJSON(res, response)
					}
				});
			}
			else
			{
				var response = {};
				response.success = false;
				tools.returnJSON(res, response)
			}
		}
		else
		{
			var response = {};
			response.success = false;
			tools.returnJSON(res, response)
		}
	}
	else
	{
		var response = {};
		response.success = false;
		tools.returnJSON(res, response)
	}
}



function delete_key(req, res)
{
	console.log('DELETE KEY '+JSON.stringify(req.body));
	
	var key   = req.body.key;
	
	if (key)
	{
		if (lang_module.get(req))
		{
			deleteKey(req,key,function(error)
			{
				if (!error)
				{
					var response = {};
					response.success = true;
					tools.returnJSON(res, response)
				}
				else
				{
					var response = {};
					response.success = false;
					tools.returnJSON(res, response)
				}
			});
		}
		else
		{
			var response = {};
			response.success = false;
			tools.returnJSON(res, response)
		}
	}
	else
	{
		var response = {};
		response.success = false;
		tools.returnJSON(res, response)
	}
	
}



////////////////////////////////
//
// HELPERS
//
////////////////////////////////



// add a value for key in the Keys KVS
// callback(error)
function setValueForKey(req,value, key, callback)
{
	var hashname = 'keys_' + lang_module.get(req);
	db.hset(hashname, key, value, function(error, value) 
	{
		callback(error);
	});
}



// callback(error, value)
function getValueForKey(req,key, callback)
{
	var hashname = 'keys_' + lang_module.get(req);
	db.hget(hashname, key, callback);
}



// callback(error)
function deleteKey(req,key, callback)
{
	var hashname = 'keys_' + lang_module.get(req);
	db.hdel(hashname, key, function(error, nbRemoved)
	{
		callback(error);
	});
}


// callback(error, value)
module.exports.getAllKeysAndValues = function(req,callback)
{
	var hashname = 'keys_' + lang_module.get(req);
	db.hgetall(hashname, callback);
}

