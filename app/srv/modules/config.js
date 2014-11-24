//
// 
// CONFIG
//
//


var db = require('./db').connect();
var tools = require('./tools');
var lang_module = require('./lang');
var fs = require('fs');



module.exports = function()
{
	var express = require('express');
	var app = express();
	
	app.set('views', GLOBAL.views_dir_path);
	app.set('view engine', 'jade');
	
	app.post('/key', post_key);
	app.get('/', page);	

	app.post('/emailcredentials', updateEmailCredentials);
	app.post('/fbconfig', updateFBConfig);

	initConfig();
		
	return app;
	
}();



function page (req, res)
{	
	getAllValues(req,function(error, value)
	{
		var options = {};
		options.siteName = 'Blog | Admin - Config';
		options.lang = lang_module.get(req);
		options.config_values = value ? value : [];


		// get email config

		fs.readFile(GLOBAL.private_dir_path + '/email_config.json', function (err, data)
		{
			if (err)
			{
				// it's ok, just needed to populate admin config page fields
			}
			else
			{
				var config = JSON.parse(data);
				var email = {};
				email.user = config.auth.XOAuth2.user;
				email.clientID = config.auth.XOAuth2.clientId;
				email.clientSecret = config.auth.XOAuth2.clientSecret;
				email.refreshToken = config.auth.XOAuth2.refreshToken;

				options.email = email;
			}


			// get facebook config

			fs.readFile(GLOBAL.private_dir_path + '/fbcomments_config.json', function (err, data)
			{
				if (err)
				{
					// it's ok, just needed to populate admin config page fields
				}
				else
				{
					var config = JSON.parse(data);
					var facebook = {};
					facebook.clientID = config.clientID;
					facebook.clientSecret = config.clientSecret;
					options.facebook = facebook;
				}

				tools.renderJade(req,res, 'admin_config', options);	

			}); // end facebook
		}); // end email
	}); // end key / values
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




// EMAILS 


function updateEmailCredentials(req,res)
{
	// only Gmail is supported
	var config = {};
	config.service = "Gmail";
	config.auth = {};
	config.auth.XOAuth2 = {};
	config.auth.XOAuth2.user = req.body.user;
	config.auth.XOAuth2.clientId = req.body.clientID;
	config.auth.XOAuth2.clientSecret = req.body.clientSecret;
	config.auth.XOAuth2.refreshToken = req.body.refreshToken;

	console.dir(config);


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


// Facebook comments

function updateFBConfig(req,res)
{
	// only Gmail is supported
	var config = {};
	config.clientID = req.body.clientID;
	config.clientSecret = req.body.clientSecret;

	console.dir(config);

	fs.writeFile( GLOBAL.private_dir_path + '/fbcomments_config.json', JSON.stringify(config), function (err)
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






