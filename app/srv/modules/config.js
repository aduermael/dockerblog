//
// 
// CONFIG
//
//


var db = require('./db').connect();
var tools = require('./tools');
var lang_module = require('./lang');



module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.set('views', GLOBAL.views_dir_path);
	app.set('view engine', 'jade');
	
	app.post('/key', post_key);
	app.get('/', page);	

	initConfig();
		
	return app;
	
}();



function page (req, res)
{	
	getAllValues(req,function(error, value)
	{
		if (!error)
		{
			// console.log('all : '+JSON.stringify(value));
			var options = {};
			options.siteName = 'Blog | Admin - Config';
			options.lang = lang_module.get(req);
			options.config_values = value ? value : [];			
			tools.renderJade(req,res, 'admin_config', options);	
		}
	});
}



function post_key(req, res)
{
	// console.log('POST CONFIG '+JSON.stringify(req.body));
	
	var key   = req.body.key;
	var value = req.body.value;
		
	if (key)
	{
		if (value)
		{
			if (lang_module.get(req))
			{
				setValueForKey(req,value, key, function(error) 
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

























// callback(error)
function setValueForKey(req,value, key, callback)
{
	var hashname = 'config_' + lang_module.get(req);
	db.hset(hashname, key, value, function(error, value) 
	{
		callback(error);
	});
}



// callback(error, value)
function getValueForKey(req,key, callback)
{
	var hashname = 'config_' + lang_module.get(req);
	db.hget(hashname, key, callback);
}



// callback(error)
function deleteValueForKey(req,key,callback)
{
	var hashname = 'config_' + lang_module.get(req);
	db.hdel(hashname, key, function(error,nbRemoved)
	{
		callback(error);
	});
}



// callback(error, value)
function getAllValues(req,callback)
{
	var hashname = 'config_' + lang_module.get(req);
	db.hgetall(hashname, callback);
}



// callback(error, keys)
function getAllKeys(lang,callback)
{
	var hashname = 'config_' + lang;
	db.hkeys(hashname, callback);
}



function initConfig()
{	
	var db_config_keys_and_values = getAllKeys('en',function(error, values) 
	{
		if (!error)
		{
			// console.log('INIT CONFIG : ' + JSON.stringify(values));
			if (!values)
			{
				values = [];
			}
			
			var config = require(GLOBAL.private_dir_path+'/config.json');
			
			var transaction = db.multi();
			Object.keys(config).forEach(function(key)
			{
				if (isInArray(key, values) == false)
				{
					var value = config[key];
					console.log('adding ' +key+'/'+value+' in DB config');
					transaction.hset('config_'+'en', key, value);
				}
			});
			
			JSON.stringify(transaction.exec());
		}
		else
		{
			// redis error
			console.log('redis error');
		}
	});
}



function isInArray(value, array)
{
	return array.indexOf(value) > -1;
}






